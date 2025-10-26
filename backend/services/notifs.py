import os
from datetime import datetime, timedelta
from typing import Iterable, Set
from bson import ObjectId
import pytz
from db.client import db_client
from pymongo.errors import OperationFailure

# Config
NOTIFY_ON_COUNTS = set(int(x) for x in os.getenv("NOTIFY_ON_COUNTS", "1,3,5").split(",") if x.strip())
NOTIFY_COOLDOWN_MIN = int(os.getenv("NOTIFY_COOLDOWN_MIN", "120"))  # 2 horas por defecto

def ensure_notif_indexes():
    """Índices para notif_logs (dedupe + consultas rápidas)"""
    db_client.notif_logs.create_index([("reserva", 1), ("usuario", 1)], unique=True)
    db_client.notif_logs.create_index([("reserva", 1), ("created_at", -1)])
    db_client.notif_logs.create_index([("origen", 1), ("created_at", -1)])
    # TTL opcional (90 días)
    ttl_days = int(os.getenv("NOTIF_TTL_DAYS", "90"))
    db_client.notif_logs.create_index([("created_at", 1)], expireAfterSeconds=ttl_days * 24 * 3600)

def get_notified_users(reserva_id: ObjectId) -> Set[ObjectId]:
    cur = db_client.notif_logs.find(
        {"reserva": reserva_id, "status": "sent"},
        {"usuario": 1}
    )
    return {doc["usuario"] for doc in cur if doc.get("usuario")}

def last_sent_at(reserva_id: ObjectId):
    doc = db_client.notif_logs.find_one(
        {"reserva": reserva_id, "status": "sent"},
        sort=[("created_at", -1)],
        projection={"created_at": 1}
    )
    return doc["created_at"] if doc else None

def should_notify_slot_by_logs(reserva_doc, argentina_tz) -> bool:
    """Decide si se puede notificar este slot según cantidad de usuarios y cooldown global del slot."""
    # 1) Umbral por cantidad de usuarios
    cant = len(reserva_doc.get("usuarios", []))
    if NOTIFY_ON_COUNTS and cant not in NOTIFY_ON_COUNTS:
        return False

    # 2) Cooldown por último envío del slot
    rid = reserva_doc.get("_id")
    if not rid:
        return True
    last = last_sent_at(rid)
    if last and (datetime.now(argentina_tz) - last) < timedelta(minutes=NOTIFY_COOLDOWN_MIN):
        return False

    return True

def log_notifications(reserva_id: ObjectId, origen: ObjectId, destinatarios: Iterable[ObjectId], status="sent"):
    """Guarda un log por destinatario para dedupe global (unique por (reserva, usuario))."""
    now = datetime.now(pytz.timezone("America/Argentina/Buenos_Aires"))
    ops = []
    for u in destinatarios:
        ops.append({
            "reserva": reserva_id,
            "usuario": u,
            "origen": origen,
            "status": status,
            "created_at": now
        })
    if not ops:
        return 0
    # insertMany “best effort” (ignorar duplicados)
    from pymongo.errors import BulkWriteError
    try:
        db_client.notif_logs.insert_many(ops, ordered=False)
        return len(ops)
    except BulkWriteError as bwe:
        # algunos podrían ser duplicados si ya estaban
        return len(ops) - sum(1 for e in bwe.details.get("writeErrors", []) if e.get("code") == 11000)

def ensure_unique_slot_index():
    """
    Asegura índice único en (cancha, fecha, hora_inicio).
    Si existe sin unique, lo migra; si no existe, lo crea.
    """
    coll = db_client.reservas
    keys = [("cancha", 1), ("fecha", 1), ("hora_inicio", 1)]
    desired_name = "uniq_slot"

    info = coll.index_information()

    # Buscar un índice existente con la misma clave
    existing_name = None
    existing_unique = None
    for name, spec in info.items():
        if spec.get("key") == keys:
            existing_name = name
            existing_unique = spec.get("unique", False)
            break

    if existing_name:
        if not existing_unique:
            # No es único -> lo dropeamos y lo creamos único
            coll.drop_index(existing_name)
            coll.create_index(keys, unique=True, name=desired_name)
        else:
            # Ya es único -> nada que hacer
            pass
    else:
        coll.create_index(keys, unique=True, name=desired_name)
