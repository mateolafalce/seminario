from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from bson import ObjectId
from datetime import datetime
import pytz
import asyncio

from db.client import db_client
from routers.Security.auth import current_user

router = APIRouter(prefix="/users_b", tags=["Reseñas"])

ARG_TZ = pytz.timezone("America/Argentina/Buenos_Aires")

class ReseñaInput(BaseModel):
    con: str  # usuario a reseñar (j)
    calificacion: str  # _id de la calificación (o opcionalmente un número)
    observacion: str = Field(..., min_length=3, max_length=500)
    reserva_id: Optional[str] = None  # opcional, si el front lo envía mejor

@router.get("/calificaciones")
async def listar_calificaciones():
    """
    Devuelve las calificaciones disponibles.
    Prioriza la colección `calificaciones` ({_id, numero}).
    Si no existe/está vacía, devuelve [1..5] simuladas (sin _id real).
    """
    def _work():
        cols = list(db_client.calificaciones.find({}, {"_id": 1, "numero": 1}))
        if cols:
            return {"calificaciones": [{"_id": str(c["_id"]), "numero": c.get("numero")} for c in cols]}
        # fallback 1..5
        return {"calificaciones": [{"_id": str(i), "numero": i} for i in range(1, 6)]}

    return await asyncio.to_thread(_work)


def _slot_datetime_fin(reserva_doc) -> Optional[datetime]:
    """
    Construye el datetime de fin del slot usando fecha (DD-MM-YYYY) + hora_fin de `horarios`.
    Retorna `None` si faltaran datos.
    """
    try:
        horario = db_client.horarios.find_one({"_id": reserva_doc["hora_inicio"]})
        if not horario or "hora" not in horario:
            return None
        hora_fin = horario["hora"].split("-")[1].strip()  # "09:00-10:30" → "10:30"
        fin_naive = datetime.strptime(f'{reserva_doc["fecha"]} {hora_fin}', "%d-%m-%Y %H:%M")
        try:
            return ARG_TZ.localize(fin_naive)
        except ValueError:
            return ARG_TZ.localize(fin_naive, is_dst=None)
    except Exception:
        return None


def _buscar_reserva_compartida(i_oid: ObjectId, j_oid: ObjectId, reserva_id: Optional[str]) -> Optional[Dict]:
    """
    Busca una reserva `Confirmada` donde i y j están en `usuarios[]` y que ya terminó.
    Si `reserva_id` se provee, valida sobre esa.
    """
    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if not est_conf:
        return None

    filtro_base = {"estado": est_conf["_id"], "usuarios.id": {"$all": [i_oid, j_oid]}}

    if reserva_id and ObjectId.is_valid(reserva_id):
        r = db_client.reservas.find_one({"_id": ObjectId(reserva_id), **filtro_base})
        if not r:
            return None
        # ⚠️ Validación de que ya haya pasado el horario fin (desactivada temporalmente)
        # fin = _slot_datetime_fin(r)
        # if not fin:
        #     return None
        # return r if fin <= datetime.now(ARG_TZ) else None
        # ✅ Siempre devolver la reserva si está en estado Confirmada y ambos jugadores están
        return r

    # si no se envió reserva_id, buscamos la última confirmada que ya terminó
    candidatos = list(db_client.reservas.find(filtro_base).sort("fecha", -1))
    for r in candidatos:
        fin = _slot_datetime_fin(r)
        if fin and fin <= datetime.now(ARG_TZ):
            return r
    return None


@router.post("/reseñar")
async def crear_reseña(payload: ReseñaInput, user: dict = Depends(current_user)):
    """
    Crea una reseña i → j SOLO si existe una reserva Confirmada finalizada con ambos.
    Evita duplicados por (i, j, reserva).
    Actualiza rating promedio y conteo en el usuario reseñado.
    """
    if not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    i_oid = ObjectId(user["id"])

    if not ObjectId.is_valid(payload.con):
        raise HTTPException(status_code=400, detail="ID de usuario a reseñar inválido")
    j_oid = ObjectId(payload.con)

    if i_oid == j_oid:
        raise HTTPException(status_code=400, detail="No puedes reseñarte a ti mismo")

    # validar calificación
    calif_oid = None
    numero_val = None
    if ObjectId.is_valid(payload.calificacion):
        calif_doc = db_client.calificaciones.find_one({"_id": ObjectId(payload.calificacion)})
        if not calif_doc:
            raise HTTPException(status_code=400, detail="Calificación inválida")
        calif_oid = calif_doc["_id"]
        numero_val = calif_doc.get("numero")
    else:
        # fallback si viene "1","2",... desde el fallback del front
        try:
            numero_val = int(payload.calificacion)
            if not (1 <= numero_val <= 5):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="Calificación inválida")

    # verificar reserva compartida y finalizada
    def _work_buscar():
        return _buscar_reserva_compartida(i_oid, j_oid, payload.reserva_id)
    reserva_comp = await asyncio.to_thread(_work_buscar)
    if not reserva_comp:
        raise HTTPException(
            status_code=400,
            detail="Solo puedes reseñar a jugadores con los que hayas jugado en una reserva confirmada y finalizada."
        )

    reserva_oid = reserva_comp["_id"]

    # evitar duplicado por (i, j, reserva)
    ya_existe = await asyncio.to_thread(
        lambda: db_client.resenias.find_one({"i": i_oid, "j": j_oid, "reserva": reserva_oid})
    )
    if ya_existe:
        raise HTTPException(status_code=409, detail="Ya reseñaste a este jugador en esta reserva.")

    # armar doc de reseña
    reseña_doc = {
        "i": i_oid,
        "j": j_oid,
        "reserva": reserva_oid,
        "calificacion_id": calif_oid,             # puede ser None si usamos solo número
        "numero": numero_val,                     # SIEMPRE guardamos el número (1..5)
        "observacion": payload.observacion.strip(),
        "fecha": datetime.now(ARG_TZ),
    }

    # insertar
    inserted = await asyncio.to_thread(lambda: db_client.resenias.insert_one(reseña_doc))

    # actualizar stats del usuario reseñado
    def _recalc_stats():
        agg = list(db_client.resenias.aggregate([
            {"$match": {"j": j_oid}},
            {"$group": {"_id": "$j", "count": {"$sum": 1}, "avg": {"$avg": "$numero"}}}
        ]))
        if agg:
            db_client.users.update_one(
                {"_id": j_oid},
                {"$set": {
                    "rating_count": agg[0]["count"],
                    "rating_avg": round(float(agg[0]["avg"]), 2)
                }}
            )
        else:
            db_client.users.update_one(
                {"_id": j_oid},
                {"$set": {"rating_count": 0, "rating_avg": None}}
            )

    await asyncio.to_thread(_recalc_stats)

    return {"msg": "Reseña guardada", "id": str(inserted.inserted_id)}


@router.get("/reseñas/listar")
async def listar_reseñas_recibidas(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(current_user)
):
    """
    Lista reseñas RECIBIDAS por el usuario logueado (paginado).
    """
    if not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    j_oid = ObjectId(user["id"])

    skip = (page - 1) * limit

    def _work():
        total = db_client.resenias.count_documents({"j": j_oid})
        rese = list(db_client.resenias.aggregate([
            {"$match": {"j": j_oid}},
            {"$sort": {"fecha": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {"$lookup": {"from": "users", "localField": "i", "foreignField": "_id", "as": "autor"}},
            {"$unwind": "$autor"},
            {"$project": {
                "_id": {"$toString": "$_id"},
                "numero": 1,
                "observacion": 1,
                "fecha": 1,
                "autor": {
                    "id": {"$toString": "$autor._id"},
                    "nombre": "$autor.nombre",
                    "apellido": "$autor.apellido",
                    "username": "$autor.username"
                }
            }}
        ]))
        return {"total": total, "page": page, "limit": limit, "reseñas": rese}

    return await asyncio.to_thread(_work)
