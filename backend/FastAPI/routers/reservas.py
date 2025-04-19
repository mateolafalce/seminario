from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from routers.defs import *
from db.models.user import User,UserDB
from db.client import db_client
from datetime import datetime
from pydantic import BaseModel 
from typing import Optional
from datetime import datetime
from routers.users_b import *
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/reservas",
                    tags=["reserva"],
                    responses={status.HTTP_400_BAD_REQUEST:{"message":"No encontrado"}})

class Reserva(BaseModel):
    cancha: str
    horario: str

def clean_mongo_doc(doc):
    doc["_id"] = str(doc["_id"])
    if "cancha" in doc:
        doc["cancha"] = str(doc["cancha"])
    if "usuario" in doc:
        doc["usuario"] = str(doc["usuario"])
    if "hora_inicio" in doc:
        doc["hora_inicio"] = str(doc["hora_inicio"])
    return doc


@router.post("/reservar")
async def reservar(reserva: Reserva, user: User = Depends(current_user)):
    fecha_actual = datetime.now()
    fecha = fecha_actual.strftime("%d-%m-%Y")

    # Validar si el horario existe
    horario_doc = db_client.horarios.find_one({"hora": reserva.horario})
    if not horario_doc:
        raise HTTPException(status_code=400, detail="Horario inválido")
    horario_id = horario_doc["_id"]

    # Validar que el usuario no tenga una reserva en el mismo horario
    reserva_existente = db_client.reservas.find_one({
        "usuario": ObjectId(user.id),
        "fecha": fecha,
        "hora_inicio": ObjectId(horario_id)
    })
    if reserva_existente:
        raise HTTPException(status_code=400, detail="Ya tenés una reserva en ese horario")

    # Buscar la cancha por nombre y obtener ID
    cancha_doc = db_client.canchas.find_one({"nombre": reserva.cancha})
    if not cancha_doc:
        raise HTTPException(status_code=400, detail="Cancha inválida")
    cancha_id = cancha_doc["_id"]

    # Validar que para una cancha en el mismo horario, a la misma fecha
    # No haya mas de 4 reservas
    filtro = {
        "$and": [
            {"cancha": cancha_id},
            {"fecha": fecha},
            {"hora_inicio": horario_id}
        ]
    }
    conteo = db_client.reservas.count_documents(filtro)
    if conteo == 4:
        raise HTTPException(status_code=400, detail="No hay cupo disponible para esta cancha en ese horario")

    nueva_reserva = {
        "cancha": cancha_id, 
        "fecha": fecha,
        "hora_inicio": horario_id,
        "usuario": ObjectId(user.id),
    }
    try:
        result = db_client.reservas.insert_one(nueva_reserva)
        nueva_reserva["_id"] = str(result.inserted_id)
        return {"msg": "Reserva guardada", "reserva": clean_mongo_doc(nueva_reserva)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar la reserva: {e}")