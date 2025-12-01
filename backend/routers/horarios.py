from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from db.client import db_client
from db.schemas.horario import horarios_schema
from routers.Security.auth import verify_csrf
from routers.Security.auth import current_user  # se sigue usando en otras rutas si lo necesitás
from routers.Security.auth import require_roles
from typing import Optional
import re

router = APIRouter(prefix="/horarios", tags=["horarios"])

# ---------- Helpers de validación de horarios ----------

# HH:MM con horas 00-23 y minutos 00-59
_TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def _parse_time_strict(value: str) -> int:
    """
    Convierte 'HH:MM' en minutos desde medianoche, validando rango.
    Lanza HTTPException si el formato o el rango son inválidos.
    """
    match = _TIME_RE.match(value)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="La hora debe tener formato HH:MM con valores entre 00:00 y 23:59.",
        )
    h = int(match.group(1))
    m = int(match.group(2))
    return h * 60 + m


def parse_interval_strict(hora: str) -> tuple[int, int]:
    """
    Valida y parsea 'HH:MM-HH:MM' → (inicio_en_min, fin_en_min).
    Lanza HTTPException si el formato es inválido o fin <= inicio.
    """
    if "-" not in hora:
        raise HTTPException(
            status_code=400,
            detail="Formato de horario inválido. Usa HH:MM-HH:MM, por ejemplo 09:00-10:30.",
        )

    left, right = [p.strip() for p in hora.split("-", 1)]
    if not left or not right:
        raise HTTPException(
            status_code=400,
            detail="Formato de horario inválido. Usa HH:MM-HH:MM, por ejemplo 09:00-10:30.",
        )

    inicio = _parse_time_strict(left)
    fin = _parse_time_strict(right)

    if fin <= inicio:
        raise HTTPException(
            status_code=400,
            detail="La hora de fin debe ser mayor a la de inicio.",
        )

    return inicio, fin


def try_parse_interval_from_db(hora: str) -> Optional[tuple[int, int]]:
    """
    Versión tolerante para datos ya guardados en DB (por si hay horarios viejos con formato raro).
    Devuelve (inicio, fin) en minutos o None si no se puede parsear.
    """
    try:
        if "-" not in hora:
            return None
        left, right = [p.strip() for p in hora.split("-", 1)]
        m1 = _TIME_RE.match(left)
        m2 = _TIME_RE.match(right)
        if not (m1 and m2):
            return None
        h1, m1v = int(m1.group(1)), int(m1.group(2))
        h2, m2v = int(m2.group(1)), int(m2.group(2))
        inicio = h1 * 60 + m1v
        fin = h2 * 60 + m2v
        if fin <= inicio:
            return None
        return inicio, fin
    except Exception:
        return None


def ensure_no_overlap(hora: str, inicio: int, fin: int, exclude_id: Optional[ObjectId] = None) -> None:
    """
    Verifica que el intervalo [inicio, fin) no se solape con ningún otro horario existente.
    Si encuentra solapamiento, lanza HTTPException 400 con detalle.
    """
    query: dict = {}
    if exclude_id is not None:
        query = {"_id": {"$ne": exclude_id}}

    existing = db_client.horarios.find(query, {"hora": 1})
    for doc in existing:
        other_hora = str(doc.get("hora") or "")
        parsed = try_parse_interval_from_db(other_hora)
        if not parsed:
            # Horario viejo con formato libre: lo ignoramos para no romper nada histórico
            continue
        o_inicio, o_fin = parsed

        # Condición de solapamiento: [inicio, fin) intersecta [o_inicio, o_fin)
        if inicio < o_fin and o_inicio < fin:
            raise HTTPException(
                status_code=400,
                detail=f"El horario {hora} se superpone con el horario existente {other_hora}.",
            )


# ---------- Rutas ----------

@router.get("/listar")
async def listar_horarios(
    simple: bool = Query(
        False,
        description="True => [{hora}] (legacy). False => [{id,hora}] (nuevo).",
    )
):
    if simple:
        rows = list(
            db_client.horarios.find({}, {"_id": 0, "hora": 1}).sort("hora", 1)
        )
        return rows
    rows = list(db_client.horarios.find({}, {"hora": 1}).sort("hora", 1))
    return horarios_schema(rows)


@router.post(
    "/crear",
    dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)],
)
async def crear_horario(payload: dict):
    hora = (payload.get("hora") or "").strip()

    if not hora:
        raise HTTPException(
            status_code=400,
            detail="El horario es obligatorio. Usa formato HH:MM-HH:MM, por ejemplo 19:00-20:30.",
        )

    # 1) Validación fuerte del rango horario
    inicio, fin = parse_interval_strict(hora)

    # 2) Evitar duplicados exactos
    if db_client.horarios.find_one({"hora": hora}):
        raise HTTPException(
            status_code=400,
            detail="Ya existe un horario con esa franja.",
        )

    # 3) Evitar solapamientos con otros horarios
    ensure_no_overlap(hora, inicio, fin, exclude_id=None)

    res = db_client.horarios.insert_one({"hora": hora})
    return {"msg": "Horario creado", "id": str(res.inserted_id)}


@router.put(
    "/modificar/{horario_id}",
    dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)],
)
async def modificar_horario(horario_id: str, payload: dict):
    if not ObjectId.is_valid(horario_id):
        raise HTTPException(status_code=400, detail="ID inválido")

    hora = (payload.get("hora") or "").strip()
    if not hora:
        raise HTTPException(
            status_code=400,
            detail="El horario es obligatorio. Usa formato HH:MM-HH:MM, por ejemplo 19:00-20:30.",
        )

    inicio, fin = parse_interval_strict(hora)
    oid = ObjectId(horario_id)

    # 1) Evitamos duplicados exactos (misma franja con otro id)
    if db_client.horarios.find_one({"hora": hora, "_id": {"$ne": oid}}):
        raise HTTPException(
            status_code=400,
            detail="Ya existe un horario con esa franja.",
        )

    # 2) Evitamos solapamientos con otros horarios
    ensure_no_overlap(hora, inicio, fin, exclude_id=oid)

    upd = db_client.horarios.update_one({"_id": oid}, {"$set": {"hora": hora}})
    if upd.matched_count == 0:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return {"msg": "Horario modificado"}


@router.delete(
    "/eliminar/{horario_id}",
    dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)],
)
async def eliminar_horario(horario_id: str):
    if not ObjectId.is_valid(horario_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    oid = ObjectId(horario_id)

    # 1. Eliminar todas las reservas que usan este horario (si es que lo referencian por ObjectId)
    reservas_eliminadas = db_client.reservas.delete_many({"hora_inicio": oid})

    # 2. Eliminar el horario de todas las preferencias que lo referencien
    db_client.preferencias.update_many(
        {"horarios": oid},
        {"$pull": {"horarios": oid}},
    )

    # 3. Eliminar preferencias que se quedaron sin horarios
    preferencias_eliminadas = db_client.preferencias.delete_many(
        {"horarios": {"$size": 0}}
    )

    # 4. Eliminar el horario de todas las canchas que lo tengan referenciado
    db_client.canchas.update_many(
        {"horarios": oid},
        {"$pull": {"horarios": oid}},
    )

    # 5. Finalmente, eliminar el horario
    res = db_client.horarios.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    return {
        "msg": "Horario eliminado con borrado en cascada",
        "reservas_eliminadas": reservas_eliminadas.deleted_count,
        "preferencias_eliminadas": preferencias_eliminadas.deleted_count,
    }


def ensure_horarios_indexes():
    from pymongo import ASCENDING

    db_client.horarios.create_index(
        [("hora", ASCENDING)], unique=True, name="hora_1_unique"
    )
