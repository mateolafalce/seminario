# routers/matcheo_debug.py
from fastapi import APIRouter, HTTPException, Query, status
from typing import List
from bson import ObjectId
from datetime import datetime
import os
import asyncio

from db.client import db_client

# 👇 Importa SOLO desde services (no desde routers) para evitar ciclos
from services.matcheo import (
    get_recommendation_split,
    get_top_matches_from_db,
    get_random_users,
    S, J, A,
    get_user_weights,
    calculate_and_store_relations,
    optimize_weights,
    get_preference_vector,
)

router = APIRouter(prefix="/matcheo-debug", tags=["Matcheo Debug"])

@router.post("/ensure-indexes")
async def ensure_indexes():
    """Build de índices básicos. Idempotente y sin unique=None."""
    created = []
    try:
        def ensure_index_safe(coll, keys, name=None, unique=None):
            kwargs = {}
            if name:
                kwargs["name"] = name
            if unique is True:
                kwargs["unique"] = True
            try:
                return coll.create_index(keys, **kwargs)
            except Exception as e:
                m = str(e)
                if "IndexKeySpecsConflict" in m or "already exists" in m:
                    return f"exists:{name or keys}"
                raise

        # pesos
        created.append(ensure_index_safe(db_client.pesos, [("i", 1), ("a", -1)], name="i_1_a_-1"))
        created.append(ensure_index_safe(db_client.pesos, [("i", 1), ("j", 1)], name="i_1_j_1", unique=True))

        # reservas
        created.append(ensure_index_safe(db_client.reservas, [("estado", 1), ("fecha", 1)], name="estado_1_fecha_1"))
        created.append(ensure_index_safe(
            db_client.reservas, [("cancha", 1), ("fecha", 1), ("hora_inicio", 1)],
            name="cancha_1_fecha_1_hora_inicio_1", unique=True
        ))
        created.append(ensure_index_safe(db_client.reservas, [("usuarios.id", 1)], name="usuarios_id_1"))

        # estadoreserva
        created.append(ensure_index_safe(db_client.estadoreserva, [("nombre", 1)], name="nombre_1", unique=True))

        # users
        created.append(ensure_index_safe(db_client.users, [("habilitado", 1)], name="habilitado_1"))
        created.append(ensure_index_safe(db_client.users, [("email", 1)], name="email_1"))

        # preferencias
        created.append(ensure_index_safe(db_client.preferencias, [("usuario_id", 1)], name="usuario_id_1"))
        created.append(ensure_index_safe(db_client.preferencias, [("dias", 1)], name="dias_1"))
        created.append(ensure_index_safe(db_client.preferencias, [("horarios", 1)], name="horarios_1"))
        created.append(ensure_index_safe(db_client.preferencias, [("canchas", 1)], name="canchas_1"))

        # notif_logs (si existe)
        try:
            created.append(ensure_index_safe(db_client.notif_logs, [("reserva", 1)], name="reserva_1"))
            created.append(ensure_index_safe(db_client.notif_logs, [("usuario", 1)], name="usuario_1"))
            created.append(ensure_index_safe(db_client.notif_logs, [("origen", 1)], name="origen_1"))
            created.append(ensure_index_safe(db_client.notif_logs, [("created_at", -1)], name="created_at_-1"))
        except Exception:
            pass

        return {"msg": "Índices listos (idempotente)", "indexes": created}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando índices: {e}")

@router.post("/rebuild")
async def rebuild_relations(run_optimize: bool = Query(default=False)):
    """Recalcula A(i,j) (y optimiza α/β opcional) en un hilo para no bloquear el loop."""
    try:
        await asyncio.to_thread(calculate_and_store_relations)
        optimized_users = 0
        if run_optimize:
            updated = await asyncio.to_thread(optimize_weights)
            optimized_users = len(updated or {})
        pesos_count = await asyncio.to_thread(lambda: db_client.pesos.count_documents({}))
        return {
            "msg": "Rebuild ejecutado",
            "pesos_count": pesos_count,
            "optimized_users": optimized_users,
            "ts": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en rebuild: {e}")

@router.get("/top/{user_id}")
async def top_for_user(
    user_id: str,
    n: int = Query(default=10, ge=1, le=100),
    include_components: bool = Query(default=True),
):
    """Top matches desde la colección pesos."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="user_id inválido")
    try:
        rows = get_top_matches_from_db(user_id, top_x=n)
        out = []
        for uid, score in rows:
            alpha, beta, _a = get_user_weights(user_id, uid)
            item = {"user_id": uid, "a": score, "alpha": alpha, "beta": beta}
            if include_components:
                try:
                    item["s"] = S(user_id, uid)
                    item["j"] = J(user_id, uid)
                except Exception:
                    item["s"] = 0.0
                    item["j"] = 0.0
            out.append(item)
        return {"user": user_id, "top": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo top: {e}")

@router.get("/pair-debug")
async def pair_debug(i: str, j: str):
    """Debug de un par: S, J, A, α/β y vectores de preferencias."""
    if not (ObjectId.is_valid(i) and ObjectId.is_valid(j)):
        raise HTTPException(status_code=400, detail="IDs inválidos")
    try:
        alpha, beta, a_db = get_user_weights(i, j)
    except Exception:
        alpha, beta, a_db = 0.5, 0.5, None

    try:
        vd_i, vh_i, vc_i = get_preference_vector(i)
        vd_j, vh_j, vc_j = get_preference_vector(j)
        s = S(i, j)
        h = J(i, j)
        a = A(i, j, alpha, beta)
        return {
            "i": i, "j": j,
            "alpha": alpha, "beta": beta,
            "A_calculado": a, "A_en_pesos": a_db,
            "S": s, "J": h,
            "prefs": {
                "i": {"dias": vd_i, "horarios": vh_i, "canchas": vc_i},
                "j": {"dias": vd_j, "horarios": vh_j, "canchas": vc_j},
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando: {e}")

@router.get("/notify-dryrun")
async def notify_dryrun(reserva_id: str, origen: str, ignore_logs: bool = Query(default=False)):
    """
    Simula el envío de notificaciones para una reserva y cuenta:
    - candidatos (y si vienen de TOP o RANDOM)
    - razones de exclusión
    - métricas S/J/A de los que pasarían
    NO envía mails ni escribe logs.
    """
    if not (ObjectId.is_valid(reserva_id) and ObjectId.is_valid(origen)):
        raise HTTPException(status_code=400, detail="IDs inválidos")

    reserva = db_client.reservas.find_one({"_id": ObjectId(reserva_id)})
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    cancha_id = reserva["cancha"]
    horario_id = reserva["hora_inicio"]
    fecha_str = reserva["fecha"]
    origen_oid = ObjectId(origen)

    # reconstruimos a_notificar para marcar top/random
    usuarios: List[str] = []
    top, rnd = get_recommendation_split()
    mejores = get_top_matches_from_db(origen, top_x=top)
    top_ids = [u for (u, _) in mejores]
    usuarios.extend(top_ids)
    excluidos = [origen] + usuarios
    aleatorios = get_random_users(exclude_user_ids=excluidos, count=rnd)
    usuarios.extend(aleatorios)
    seen = set()
    candidatos = [u for u in usuarios if not (u in seen or seen.add(u))]
    src = {u: ("top" if u in top_ids else "random") for u in candidatos}

    # ya notificados (si existen logs)
    ya_notificados = set()
    if not ignore_logs:
        try:
            for log in db_client.notif_logs.find({"reserva": ObjectId(reserva_id)}, {"usuario": 1}):
                if log.get("usuario"):
                    ya_notificados.add(str(log["usuario"]))
        except Exception:
            pass

    def _tiene_conflicto_slot(user_oid, fecha, horario_id) -> bool:
        est_res = db_client.estadoreserva.find_one({"nombre": "Reservada"})
        if not est_res:
            return False
        return db_client.reservas.find_one({
            "fecha": fecha,
            "hora_inicio": horario_id,
            "estado": est_res["_id"],
            "usuarios.id": user_oid
        }) is not None

    def _match_preferencia(user_oid, fecha, horario_id, cancha_id) -> bool:
        if os.getenv("ENFORCE_PREFS_NOTIF", "false").lower() != "true":
            return True
        try:
            from datetime import datetime as _dt
            dia_nombre = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][_dt.strptime(fecha, "%d-%m-%Y").weekday()]
            dia_doc = db_client.dias.find_one({"nombre": dia_nombre})
            dia_id = dia_doc["_id"] if dia_doc else None
            query = {
                "usuario_id": user_oid,
                "horarios": {"$in": [horario_id]},
                "canchas": {"$in": [cancha_id]}
            }
            if dia_id:
                query["dias"] = {"$in": [dia_id]}
            return db_client.preferencias.find_one(query) is not None
        except:
            return True

    detalles = []
    notificados = []
    vistos_usuarios = set()
    vistos_emails = set()

    for uid in candidatos:
        item = {"user_id": uid, "origen": src.get(uid, "unknown"),
                "razones_exclusion": [], "S": None, "J": None, "A": None}
        if not ObjectId.is_valid(uid):
            item["razones_exclusion"].append("id_invalido")
            detalles.append(item); continue
        oid = ObjectId(uid)

        # métricas SIEMPRE visibles
        try:
            s = S(origen, uid)
            j = J(origen, uid)
            alpha, beta, _a_db = get_user_weights(origen, uid)
            a = A(origen, uid, alpha, beta)
            item["S"] = s; item["J"] = j; item["A"] = a
        except Exception:
            pass

        if oid == origen_oid:
            item["razones_exclusion"].append("origen==destino"); detalles.append(item); continue
        if uid in ya_notificados:
            item["razones_exclusion"].append("ya_notificado_previamente"); detalles.append(item); continue

        u = db_client.users.find_one({"_id": oid, "habilitado": True})
        if not u:
            item["razones_exclusion"].append("usuario_no_habilitado_o_inexistente"); detalles.append(item); continue

        email = u.get("email")
        if not email:
            item["razones_exclusion"].append("sin_email"); detalles.append(item); continue
        if email in vistos_emails:
            item["razones_exclusion"].append("email_duplicado"); detalles.append(item); continue

        if _tiene_conflicto_slot(oid, fecha_str, horario_id):
            item["razones_exclusion"].append("conflicto_de_slot"); detalles.append(item); continue

        if not _match_preferencia(oid, fecha_str, horario_id, cancha_id):
            item["razones_exclusion"].append("no_match_preferencias"); detalles.append(item); continue

        notificados.append(uid)
        vistos_emails.add(email)
        vistos_usuarios.add(oid)
        detalles.append(item)

    return {
        "reserva_id": reserva_id,
        "origen": origen,
        "fecha": fecha_str,
        "cancha": str(cancha_id),
        "horario": str(horario_id),
        "candidatos": candidatos,
        "resultado_notificados": notificados,
        "detalles": detalles,
    }
