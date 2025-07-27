from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from routers.defs import *
from db.models.user import User, UserDB
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
import pytz  # Importante: añade esta importación

# Define la clase Reserva que falta


class Reserva(BaseModel):
    cancha: str
    horario: str
    fecha: str  # DD-MM-YYYY format


router = APIRouter(prefix="/reservas",
                   tags=["reservas"],
                   responses={404: {"message": "No encontrado"}})


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

    try:
        # --- Validación de la fecha ---
        fecha_reserva_dt = datetime.strptime(reserva.fecha, "%d-%m-%Y").date()
        ahora_dt = datetime.now(argentina_tz)
        hoy_dt = ahora_dt.date()
        limite_dt = hoy_dt + timedelta(days=7)

        if not (hoy_dt <= fecha_reserva_dt < limite_dt):
            raise ValueError(
                "La fecha de reserva debe ser entre hoy y los próximos 6 días.")

        # --- Validación de horarios pasados (solo para el día de hoy) ---
        if fecha_reserva_dt == hoy_dt:
            hora_inicio_str = reserva.horario.split('-')[0]  # "09:00"
            hora_reserva_dt = ahora_dt.replace(
                hour=int(hora_inicio_str.split(':')[0]),
                minute=int(hora_inicio_str.split(':')[1]),
                second=0,
                microsecond=0
            )
            if (hora_reserva_dt - ahora_dt) < timedelta(hours=1):
                raise ValueError(
                    "No puedes reservar en un horario que ya pasó o con menos de 1 hora de antelación.")

        # Verificar que tenemos un ID de usuario válido
        if not user.get("id") or not ObjectId.is_valid(user["id"]):
            raise HTTPException(
                status_code=400,
                detail="ID de usuario no válido")

        # Validar si el usuario está habilitado para hacer reservas
        if user.get("habilitado") is not True:
            raise HTTPException(
                status_code=403,
                detail="Usuario no habilitado para hacer reservas")

        def operaciones_sincronas():
            # Validar si el horario existe
            horario_doc = db_client.horarios.find_one(
                {"hora": reserva.horario})
            if not horario_doc:
                raise ValueError("Horario inválido")
            horario_id = horario_doc["_id"]

            # Validar que el usuario no tenga una reserva en el mismo horario y
            # fecha
            reserva_existente = db_client.reservas.find_one({
                "usuario": ObjectId(user["id"]),
                "fecha": reserva.fecha,
                "hora_inicio": ObjectId(horario_id)
            })
            if reserva_existente:
                raise ValueError("Ya tenés una reserva en ese horario y fecha")

            # Buscar la cancha por nombre y obtener ID
            cancha_doc = db_client.canchas.find_one({"nombre": reserva.cancha})
            if not cancha_doc:
                raise ValueError("Cancha inválida")
            cancha_id = cancha_doc["_id"]

            # Validar disponibilidad
            filtro = {
                "$and": [
                    {"cancha": cancha_id},
                    {"fecha": reserva.fecha},
                    {"hora_inicio": horario_id}
                ]
            }
            conteo = db_client.reservas.count_documents(filtro)
            if conteo >= 4:
                raise ValueError(
                    "No hay cupo disponible para esta cancha en ese horario")

            nueva_reserva = {
                "cancha": cancha_id,
                "fecha": reserva.fecha,
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


@router.get("/mis-reservas")
async def get_mis_reservas(user: dict = Depends(current_user)):
    user_id = ObjectId(user["id"])

    pipeline = [
        {"$match": {"usuario": user_id}},
        {"$lookup": {"from": "canchas", "localField": "cancha", "foreignField": "_id", "as": "cancha_info"}},
        {"$unwind": "$cancha_info"},
        {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
        {"$unwind": "$horario_info"},
        {"$project": {
            "_id": 1, "fecha": 1, "cancha": "$cancha_info.nombre", "horario": "$horario_info.hora"
        }},
        {"$sort": {"fecha": 1, "horario": 1}}
    ]

    reservas_cursor = await asyncio.to_thread(lambda: list(db_client.reservas.aggregate(pipeline)))

    reservas_list = []
    for r in reservas_cursor:
        r["_id"] = str(r["_id"])
        reservas_list.append(r)

    return reservas_list


@router.delete("/cancelar/{reserva_id}")
async def cancelar_reserva(
        reserva_id: str,
        user: dict = Depends(current_user)):
    if not ObjectId.is_valid(reserva_id):
        raise HTTPException(status_code=400, detail="ID de reserva inválido")

    reserva_oid = ObjectId(reserva_id)

    reserva = await asyncio.to_thread(
        lambda: db_client.reservas.find_one({"_id": reserva_oid, "usuario": ObjectId(user["id"])})
    )

    if not reserva:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada o no tienes permiso para cancelarla")

    horario_doc = await asyncio.to_thread(lambda: db_client.horarios.find_one({"_id": reserva["hora_inicio"]}))
    hora_inicio_str = horario_doc["hora"].split('-')[0]

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    reserva_dt_str = f"{reserva['fecha']} {hora_inicio_str}"
    reserva_dt = datetime.strptime(reserva_dt_str, "%d-%m-%Y %H:%M")
    reserva_dt = argentina_tz.localize(reserva_dt)

    ahora_dt = datetime.now(argentina_tz)

    # Se comprueba si la diferencia entre la hora de la reserva y la hora
    # actual es de al menos 1 hora.
    if (reserva_dt - ahora_dt) >= timedelta(hours=1):
        # Si la condición se cumple, se procede a eliminar la reserva.
        result = await asyncio.to_thread(lambda: db_client.reservas.delete_one({"_id": reserva_oid}))

        if result.deleted_count == 1:
            return {"msg": "Reserva cancelada con éxito"}
        else:
            # Este caso es poco probable si la búsqueda inicial tuvo éxito,
            # pero es una buena práctica manejarlo.
            raise HTTPException(status_code=500,
                                detail="Error al procesar la cancelación.")
    else:
        # Si queda menos de 1 hora, se deniega la cancelación.
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar la reserva con menos de 1 hora de antelación.")


@router.get("/cantidad")
async def obtener_cantidad_reservas(fecha: str):
    # Validar formato de fecha
    try:
        datetime.strptime(fecha, "%d-%m-%Y")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de fecha inválido. Use DD-MM-YYYY.")

    pipeline = [
        {
            "$match": {"fecha": fecha}  # Filtrar por la fecha proporcionada
        },
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
