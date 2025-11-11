from __future__ import annotations
from typing import Optional, Tuple, Dict, Any, List
from bson import ObjectId
from pymongo import ASCENDING
from datetime import datetime
import pytz
import secrets
import asyncio
import re

from db.client import db_client
from services.persona import (
    create_persona_for_user,
    update_persona_fields
)
from services.authz import assign_role
from utils.security import (
    generate_salt, hash_password_with_salt,
    verify_password_with_salt, is_bcrypt_hash
)
from services.email_service import send_verification_email

# opcional: solo por compat (si quedara algún usuario viejo en bcrypt)
try:
    from passlib.context import CryptContext
    _crypt = CryptContext(schemes=["bcrypt"])
except Exception:
    _crypt = None

_TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")

def _now_ar_str() -> str:
    return datetime.now(_TZ_AR).strftime("%Y-%m-%d %H:%M:%S")


def ensure_user_indexes() -> None:
    """
    username: único
    persona : uno-a-uno con users (único)
    """
    db_client.users.create_index([("username", ASCENDING)], unique=True, name="users_username_1_unique")
    db_client.users.create_index([("persona", ASCENDING)], unique=True, name="users_persona_1_unique")


def get_user_by_id(user_id: ObjectId | str) -> Optional[Dict[str, Any]]:
    oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
    return db_client.users.find_one({"_id": oid})

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    return db_client.users.find_one({"username": username})


def verify_password(user_doc: Dict[str, Any], plain: str) -> bool:
    pwd = user_doc.get("password", "")
    salt = user_doc.get("salt")
    if salt:
        return verify_password_with_salt(plain, salt, pwd)
    if is_bcrypt_hash(pwd) and _crypt:
        return _crypt.verify(plain, pwd)
    return False

def create_user_account(
    username: str,
    raw_password: str,
    persona_id: ObjectId,
    habilitado: bool = False,
    categoria: Optional[ObjectId] = None,
) -> ObjectId:
    ensure_user_indexes()

    salt = generate_salt()
    hashed = hash_password_with_salt(raw_password, salt)

    doc = {
        "username": username,
        "password": hashed,
        "salt": salt,
        "persona": persona_id,
        "habilitado": bool(habilitado),
        "categoria": categoria,
        "fecha_registro": _now_ar_str(),
        "ultima_conexion": None,
        "habilitacion_token": None,
    }
    return db_client.users.insert_one(doc).inserted_id

def update_last_login(user_id: ObjectId | str) -> None:
    oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
    db_client.users.update_one({"_id": oid}, {"$set": {"ultima_conexion": _now_ar_str()}})


def register_new_user(payload) -> Tuple[ObjectId, ObjectId]:
    """
    Orquesta el alta:
    1) crea/actualiza PERSONA (dni único) con nombre/apellido/email
    2) crea USER (username/password) apuntando a persona
    3) asigna rol 'usuario'
    4) ENVÍA EMAIL DE VERIFICACIÓN 
    Retorna: (user_id, persona_id)
    """
    # Persona
    persona_id = create_persona_for_user(
        nombre=payload.nombre,
        apellido=payload.apellido,
        email=payload.email,
        dni=payload.dni,
    )
    
    #  GENERAR TOKEN DE VERIFICACIÓN
    verification_token = secrets.token_urlsafe(32)
    
    # User
    user_id = create_user_account(
        username=payload.username,
        raw_password=payload.password,
        persona_id=persona_id,
        habilitado=False,
        categoria=None,
    )
    
    #  GUARDAR EL TOKEN EN LA DB
    db_client.users.update_one(
        {"_id": user_id},
        {"$set": {"habilitacion_token": verification_token}}
    )
    
    # Rol por defecto
    assign_role(str(user_id), "usuario")
    
    #  ENVIAR EMAIL (asíncrono, no bloquea el registro si falla)
    try:
        # Ejecutar la función async en el event loop actual
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Si ya hay un loop corriendo, usar create_task
            asyncio.create_task(send_verification_email(
                email=payload.email,
                nombre=payload.nombre,
                token=verification_token
            ))
        else:
            # Si no hay loop, usar run_until_complete
            loop.run_until_complete(send_verification_email(
                email=payload.email,
                nombre=payload.nombre,
                token=verification_token
            ))
        print(f"✅ [REGISTRO] Email de verificación enviado a {payload.email}")
    except Exception as e:
        print(f"⚠️ [REGISTRO] No se pudo enviar email a {payload.email}: {e}")
        # NO fallar el registro si el email falla
    
    return user_id, persona_id


def get_user_and_persona(user_id: ObjectId | str) -> Tuple[Optional[Dict], Optional[Dict]]:
    u = get_user_by_id(user_id)
    if not u:
        return None, None
    p = db_client.personas.find_one({"_id": u.get("persona")}) if u.get("persona") else None
    return u, p


def delete_user_cascade(user_id: ObjectId | str) -> bool:
    """
    Borra el usuario y TODO lo asociado (preferencias, pesos, notif_logs, reseñas,
    roles, reservas –elimina o saca al usuario–, y colecciones legacy admins/empleados).
    """
    oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id

    # preferencias
    db_client.preferencias.delete_many({"usuario_id": oid})

    # pesos
    db_client.pesos.delete_many({"$or": [{"i": oid}, {"j": oid}]})

    # notificaciones logs
    db_client.notif_logs.delete_many({"$or": [{"origen": oid}, {"usuario": oid}]})

    # reseñas
    db_client.resenias.delete_many({"$or": [{"i": oid}, {"j": oid}]})

    
    reservas_usuario = list(db_client.reservas.find({"usuarios.id": oid}))
    for r in reservas_usuario:
        cant = len(r.get("usuarios", []))
        if cant <= 1:
            db_client.reservas.delete_one({"_id": r["_id"]})
            try:
                from services.scheduler import cancelar_recordatorio_reserva
                cancelar_recordatorio_reserva(str(r["_id"]))
            except Exception:
                pass
        else:
            db_client.reservas.update_one(
                {"_id": r["_id"]},
                {"$pull": {"usuarios": {"id": oid}}}
            )

    # RBAC
    db_client.user_roles.delete_many({"user": oid})

    # Legacy (por si aún existe)
    db_client.admins.delete_one({"user": oid})
    db_client.empleados.delete_one({"user": oid})

    # Por último, el usuario
    res = db_client.users.delete_one({"_id": oid})
    return res.deleted_count > 0


def update_persona_by_user_id(user_id, data):
    oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
    u = db_client.users.find_one({"_id": oid}, {"persona": 1})
    if not u or not u.get("persona"):
        raise ValueError("Usuario o persona no encontrados")
    p = update_persona_fields(u["persona"], data)
    ufull = db_client.users.find_one({"_id": oid})
    return ufull, p


def list_users_with_personas(page: int = 1, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Lista users con join a personas y categorias. Devuelve 'categoria_nombre' además del id.
    """
    skip = max(page - 1, 0) * limit
    pipeline = [
        # Join a personas
        {"$lookup": {
            "from": "personas",
            "localField": "persona",
            "foreignField": "_id",
            "as": "persona"
        }},
        {"$unwind": "$persona"},

        # Join a categorias (puede ser null)
        {"$lookup": {
            "from": "categorias",
            "localField": "categoria",
            "foreignField": "_id",
            "as": "categoria_doc"
        }},
        {"$unwind": {"path": "$categoria_doc", "preserveNullAndEmptyArrays": True}},

        # Proyección
        {"$project": {
            "_id": 1,
            "username": 1,
            "roles": 1,
            "habilitado": 1,
            "fecha_registro": 1,
            "ultima_conexion": 1,
            "categoria": 1,                          # deja el ObjectId por si hace falta
            "categoria_nombre": "$categoria_doc.nombre",
            "persona": {
                "id": {"$toString": "$persona._id"},
                "nombre": "$persona.nombre",
                "apellido": "$persona.apellido",
                "email": "$persona.email",
                "dni": "$persona.dni"
            }
        }},
        {"$skip": skip},
        {"$limit": limit},
    ]
    return list(db_client.users.aggregate(pipeline))


def search_users_by_persona(term: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Busca por prefijo (empieza con) en username/nombre/apellido/dni.
    """
    term = (term or "").strip()
    if not term:
        return []

    safe = re.escape(term)  
    pipeline = [
        {"$lookup": {
            "from": "personas",
            "localField": "persona",
            "foreignField": "_id",
            "as": "persona"
        }},
        {"$unwind": "$persona"},

        {"$addFields": {"dni_str": {"$toString": "$persona.dni"}}}, 

        # SOLO "empieza con" (prefix) para username, nombre, apellido y dni
        {"$match": {
            "$or": [
                {"username":        {"$regex": f"^{safe}", "$options": "i"}},
                {"persona.nombre":  {"$regex": f"^{safe}", "$options": "i"}},
                {"persona.apellido":{"$regex": f"^{safe}", "$options": "i"}},
                {"dni_str":         {"$regex": f"^{safe}"}}
            ]
        }},

        {"$project": {
            "_id": 1, "username": 1, "roles": 1, "habilitado": 1,
            "fecha_registro": 1, "ultima_conexion": 1,
            "persona": {
                "_id": {"$toString": "$persona._id"},
                "nombre": "$persona.nombre",
                "apellido": "$persona.apellido",
                "email": "$persona.email",
                "dni": "$persona.dni"
            }
        }},
        {"$limit": int(limit or 50)}
    ]

    rows = list(db_client.users.aggregate(pipeline))
    return rows
