# routers/matcheo_debug.py
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, status, Body, Depends
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
import os
import asyncio

from db.client import db_client
from routers.Security.auth import require_roles, verify_csrf

from services.matcheo import (
    get_recommendation_split,
    get_top_matches_from_db,
    S, J, A,
    get_user_weights,
    calculate_and_store_relations,
    optimize_weights,
    get_preference_vector,
)

# Verificar que debug tools esté habilitado
if not os.getenv("DEBUG_TOOLS", "").lower() in {"1", "true", "yes"}:
    def _disabled(*args, **kwargs):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Deshabilitar todos los endpoints si DEBUG_TOOLS no está activo
    class DisabledRouter:
        def __getattr__(self, name):
            return _disabled
    router = DisabledRouter()
else:
    router = APIRouter(prefix="/matcheo-debug", tags=["Matcheo Debug"])

@router.post("/ensure-indexes", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
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

@router.post("/rebuild", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
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

@router.get("/top/{user_id}", dependencies=[Depends(require_roles("admin"))])
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

@router.get("/pair-debug", dependencies=[Depends(require_roles("admin"))])
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

@router.get("/notify-dryrun", dependencies=[Depends(require_roles("admin"))])
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

        u = db_client.users.find_one({"_id": oid, "habilitado": True}, {"persona": 1})
        if not u:
            item["razones_exclusion"].append("usuario_no_habilitado_o_inexistente"); detalles.append(item); continue
        
        # Buscar email en personas
        persona = None
        if u.get("persona"):
            persona = db_client.personas.find_one({"_id": u["persona"]}, {"email": 1})
        
        email = persona.get("email") if persona else None
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

# ---------- Helpers ----------

def _upsert_by_nombre(coll, nombre: str, extra: Dict[str, Any]) -> str:
    doc = coll.find_one({"nombre": nombre})
    if doc:
        return str(doc["_id"])
    res = coll.insert_one({"nombre": nombre, **extra})
    return str(res.inserted_id)

def _get_id_by_nombre(coll, nombre: str) -> Optional[ObjectId]:
    doc = coll.find_one({"nombre": nombre}, {"_id": 1})
    return doc["_id"] if doc else None

# ---------- Seed básico de mundo ----------

@router.post("/seed/minimal-world", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def seed_minimal_world(tag: str = Query(default="debug")):
    try:
        # 1. Establecer estado "Reservada" para pruebas
        _upsert_by_nombre(db_client.estadoreserva, "Reservada", {"color": "gris", "es_default": True})

        # 2. Días de la semana (7 días)
        dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        for dia in dias:
            _upsert_by_nombre(db_client.dias, dia, {})

        # 3. Canchas (3 canchas por día, 7 días a la semana)
        for dia in dias:
            dia_doc = db_client.dias.find_one({"nombre": dia})
            if dia_doc:
                for i in range(1, 4):
                    _upsert_by_nombre(db_client.canchas, f"Cancha {i} {dia}", {
                        "tipo": "futbol",
                        "habilitada": True,
                        "dias": [dia_doc["_id"]],
                        "estado": "disponible",
                    })

        # 4. Horarios (cada hora desde las 08:00 hasta las 20:00)
        for h in range(8, 21):
            hora_str = f"{h:02}:00"
            _upsert_by_nombre(db_client.horarios, hora_str, {})

        return {"msg": "Seed de mundo minimal ejecutado", "tag": tag}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en seed minimal-world: {e}")

# ---------- Seed de usuarios ----------

@router.post("/seed/users", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def seed_users(n: int = Query(default=2, ge=1, le=50), tag: str = Query(default="debug")):
    try:
        # Roles básicos
        _upsert_by_nombre(db_client.roles, "usuario", {"permiso": "usuario"})
        _upsert_by_nombre(db_client.roles, "admin", {"permiso": "admin"})

        # Seed de usuarios con personas
        for i in range(n):
            email = f"usuario{i+1}@ejemplo.com"
            username = f"usuario{i+1}"
            
            # 1. Crear persona
            persona_id = db_client.personas.insert_one({
                "nombre": f"Usuario{i+1}",
                "apellido": f"Prueba",
                "email": email,
                "dni": f"{10000000 + i}",
                "tag": tag
            }).inserted_id
            
            # 2. Crear usuario (cuenta) referenciando a persona
            from services.user import hash_password
            salt, hashed = hash_password("password")
            db_client.users.insert_one({
                "username": username,
                "persona": persona_id,
                "password": hashed,
                "salt": salt,
                "habilitado": True,
                "categoria": None,
                "fecha_registro": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "tag": tag
            })

        return {"msg": "Seed de usuarios ejecutado", "n": n, "tag": tag}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en seed users: {e}")

# ---------- Crear reserva simple ----------

class ReservaIn(BaseModel):
    fecha: str = Field(..., description="Formato 'dd-mm-YYYY'")
    cancha_id: Optional[str] = None
    cancha_nombre: Optional[str] = None
    horario_id: Optional[str] = None
    horario_hhmm: Optional[str] = None
    usuarios: Optional[list[str]] = Field(default_factory=list, description="Lista de user_ids")
    estado_nombre: str = Field(default="Reservada")
    tag: str = Field(default="debug")

@router.post("/seed/reserva", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def seed_reserva(payload: ReservaIn = Body(...)):
    try:
        # 1. Buscar o crear estado
        estado_id = _get_id_by_nombre(db_client.estadoreserva, payload.estado_nombre)
        if not estado_id:
            raise HTTPException(status_code=400, detail="Estado no válido")

        # 2. Parsear fecha
        fecha_dt = datetime.strptime(payload.fecha, "%d-%m-%Y")
        fecha_str = fecha_dt.strftime("%Y-%m-%d")

        # 3. Buscar cancha
        cancha_id = None
        if payload.cancha_id:
            cancha_id = ObjectId(payload.cancha_id)
        elif payload.cancha_nombre:
            cancha_id = _get_id_by_nombre(db_client.canchas, payload.cancha_nombre)
        if not cancha_id:
            raise HTTPException(status_code=400, detail="Cancha no válida")

        # 4. Buscar horario
        horario_id = None
        if payload.horario_id:
            horario_id = ObjectId(payload.horario_id)
        elif payload.horario_hhmm:
            horario_id = _get_id_by_nombre(db_client.horarios, payload.horario_hhmm)
        if not horario_id:
            raise HTTPException(status_code=400, detail="Horario no válido")

        # 5. Crear reserva
        reserva_id = db_client.reservas.insert_one({
            "fecha": fecha_str,
            "cancha": cancha_id,
            "hora_inicio": horario_id,
            "estado": estado_id,
            "usuarios": [{"id": ObjectId(uid)} for uid in payload.usuarios],
            "tag": payload.tag,
        }).inserted_id

        return {"msg": "Reserva creada", "reserva_id": str(reserva_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando reserva: {e}")

# ---------- Wipe de datos con tag ----------

@router.post("/seed/wipe", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def seed_wipe(tag: str = Query(default="debug")):
    try:
        # Eliminar reservas
        db_client.reservas.delete_many({"tag": tag})

        # Eliminar usuarios
        db_client.users.delete_many({"tag": tag})
        
        # Eliminar personas
        db_client.personas.delete_many({"tag": tag})

        return {"msg": "Datos eliminados con tag", "tag": tag}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en wipe: {e}")

# ---------- a_notificar directo ----------

@router.get("/a-notificar/{user_id}", dependencies=[Depends(require_roles("admin"))])
async def a_notificar_route(user_id: str):
    """Obtener lista de usuarios a notificar para un usuario dado."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="user_id inválido")
    try:
        top = 5
        rnd = 5
        usuarios = [user_id]

        # Obtener top matches
        mejores = get_top_matches_from_db(user_id, top_x=top)
        top_ids = [u for (u, _) in mejores]
        usuarios.extend(top_ids)

        # Obtener aleatorios
        excluidos = usuarios
        aleatorios = get_random_users(exclude_user_ids=excluidos, count=rnd)
        usuarios.extend(aleatorios)

        # Eliminar duplicados
        seen = set()
        candidatos = [u for u in usuarios if not (u in seen or seen.add(u))]

        return {"user_id": user_id, "candidatos": candidatos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en a_notificar: {e}")

# ---------- Smoke test ----------

@router.get("/smoke")
async def smoke():
    return {"msg": "API funcionando"}

# ---------- Limpiar caches de catálogos ----------

@router.post("/invalidate-caches", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def invalidate_caches():
    try:
        db_client.users.delete_many({})
        db_client.personas.delete_many({})
        db_client.pesos.delete_many({})
        db_client.reservas.delete_many({})
        db_client.notif_logs.delete_many({})
        db_client.preferencias.delete_many({})
        db_client.estadoreserva.delete_many({})
        db_client.dias.delete_many({})
        db_client.horarios.delete_many({})
        db_client.canchas.delete_many({})
        return {"msg": "Caches de catálogos limpiados"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error limpiando caches: {e}")

# ---------- Hardened get_random_users ----------

def get_random_users(exclude_user_ids: List[str] = None, count: int = 5) -> List[str]:
    if exclude_user_ids is None:
        exclude_user_ids = []
    exclude_oids = [ObjectId(x) for x in exclude_user_ids if ObjectId.is_valid(x)]

    match = {"habilitado": True, "_id": {"$nin": exclude_oids}}
    available = db_client.users.count_documents(match)
    size = min(count, max(0, available))

    if size == 0:
        return []

    pipeline = [
        {"$match": match},
        {"$sample": {"size": size}},
        {"$project": {"user_id": {"$toString": "$_id"}}}
    ]
    rows = list(db_client.users.aggregate(pipeline))
    return [r["user_id"] for r in rows]
