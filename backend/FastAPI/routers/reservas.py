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
from typing import List, Dict
from fastapi.responses import JSONResponse
import asyncio

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
async def reservar(reserva: Reserva, user: dict = Depends(current_user)):
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    fecha = datetime.now(argentina_tz).strftime("%d-%m-%Y")
    try:
        # Verificar que tenemos un ID de usuario válido
        if not user.get("id") or not ObjectId.is_valid(user["id"]):
            raise HTTPException(status_code=400, detail="ID de usuario no válido")

        # Validar si el usuario está habilitado para hacer reservas
        if user.get("habilitado") is not True:
            raise HTTPException(status_code=403, detail="Usuario no habilitado para hacer reservas")

        def operaciones_sincronas():
            # Validar si el horario existe
            horario_doc = db_client.horarios.find_one({"hora": reserva.horario})
            if not horario_doc:
                raise ValueError("Horario inválido")
            horario_id = horario_doc["_id"]

            # Validar que el usuario no tenga una reserva en el mismo horario
            reserva_existente = db_client.reservas.find_one({
                "usuario": ObjectId(user["id"]),
                "fecha": fecha,
                "hora_inicio": ObjectId(horario_id)
            })
            if reserva_existente:
                raise ValueError("Ya tenés una reserva en ese horario")

            # Buscar la cancha por nombre y obtener ID
            cancha_doc = db_client.canchas.find_one({"nombre": reserva.cancha})
            if not cancha_doc:
                raise ValueError("Cancha inválida")
            cancha_id = cancha_doc["_id"]

            # Validar disponibilidad
            filtro = {
                "$and": [
                    {"cancha": cancha_id},
                    {"fecha": fecha},
                    {"hora_inicio": horario_id}
                ]
            }
            conteo = db_client.reservas.count_documents(filtro)
            if conteo >= 4:
                raise ValueError("No hay cupo disponible para esta cancha en ese horario")

            nueva_reserva = {
                "cancha": cancha_id, 
                "fecha": fecha,
                "hora_inicio": horario_id,
                "usuario": ObjectId(user["id"]),
            }
            
            result = db_client.reservas.insert_one(nueva_reserva)
            nueva_reserva["_id"] = str(result.inserted_id)
            return nueva_reserva

        resultado = await asyncio.to_thread(operaciones_sincronas)
        return {
            "msg": "Reserva guardada", 
            "reserva": clean_mongo_doc(resultado)
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al guardar la reserva: {str(e)}"
        )
               
@router.get("/cantidad")
async def obtener_cantidad_reservas():
    pipeline = [
        {
            "$group": {
                "_id": {"cancha": "$cancha", "hora_inicio": "$hora_inicio"}, 
                "cantidad": {"$sum": 1}
            }
        },
        {
            "$project": {
                "_id": 0,
                "cancha": "$_id.cancha",
                "hora_inicio": "$_id.hora_inicio", 
                "cantidad": 1
            }
        }
    ]

    def obtener_datos():
        reservas_agrupadas = list(db_client.reservas.aggregate(pipeline))
        canchas = {str(c["_id"]): c["nombre"] 
                  for c in db_client.canchas.find({}, {"_id": 1, "nombre": 1})}
        horarios = {str(h["_id"]): h["hora"] 
                   for h in db_client.horarios.find({}, {"_id": 1, "hora": 1})}
        return [
            {
                "cancha": canchas.get(str(reserva["cancha"]), "Desconocida"),
                "horario": horarios.get(str(reserva["hora_inicio"]), "Desconocido"),
                "cantidad": reserva["cantidad"]
            }
            for reserva in reservas_agrupadas
        ]

    try:
        resultado = await asyncio.to_thread(obtener_datos)
        return JSONResponse(content=resultado)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al obtener cantidad de reservas: {str(e)}"
        )
