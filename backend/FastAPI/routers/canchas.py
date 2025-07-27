from fastapi import APIRouter, HTTPException, status, Depends, Body
from pydantic import BaseModel
from db.client import db_client
from routers.Security.auth import current_user
from bson import ObjectId
import asyncio


class CanchaInput(BaseModel):
    nombre: str


router = APIRouter(prefix="/canchas", tags=["Canchas"])


@router.post("/crear")
async def crear_cancha(
        cancha: CanchaInput,
        user: dict = Depends(current_user)):
    # Obtener el ID del usuario correctamente (tanto si es dict como User)
    user_id = user.get("id") if isinstance(user, dict) else user.id

    # Verificar si el usuario es admin (operaciones síncronas en hilo separado)
    user_db_data = await asyncio.to_thread(
        lambda: db_client.users.find_one({"_id": ObjectId(user_id)})
    )
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    admin_data = await asyncio.to_thread(
        lambda: db_client.admins.find_one({"user": user_db_data["_id"]})
    )
    if not admin_data:
        raise HTTPException(status_code=403,
                            detail="Solo los admin pueden buscar clientes")

    # Validar nombre único
    if db_client.canchas.find_one({"nombre": cancha.nombre}):
        raise HTTPException(status_code=400,
                            detail="Ya existe una cancha con ese nombre")

    nueva_cancha = {"nombre": cancha.nombre}
    result = db_client.canchas.insert_one(nueva_cancha)
    return {"msg": "Cancha creada con éxito", "id": str(result.inserted_id)}


@router.get("/listar")
async def listar_canchas(user: dict = Depends(current_user)):
    canchas = list(db_client.canchas.find())
    return [{"id": str(c["_id"]), "nombre": c["nombre"]} for c in canchas]


@router.delete("/eliminar/{cancha_id}")
async def eliminar_cancha(cancha_id: str, user: dict = Depends(current_user)):
    user_id = user.get("id") if isinstance(user, dict) else user.id
    user_db_data = await asyncio.to_thread(
        lambda: db_client.users.find_one({"_id": ObjectId(user_id)})
    )
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    admin_data = await asyncio.to_thread(
        lambda: db_client.admins.find_one({"user": user_db_data["_id"]})
    )
    if not admin_data:
        raise HTTPException(status_code=403,
                            detail="Solo los admin pueden eliminar canchas")
    result = db_client.canchas.delete_one({"_id": ObjectId(cancha_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return {"msg": "Cancha eliminada"}


@router.put("/modificar/{cancha_id}")
async def modificar_cancha(
        cancha_id: str,
        data: dict = Body(...),
        user: dict = Depends(current_user)):
    user_id = user.get("id") if isinstance(user, dict) else user.id
    user_db_data = await asyncio.to_thread(
        lambda: db_client.users.find_one({"_id": ObjectId(user_id)})
    )
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    admin_data = await asyncio.to_thread(
        lambda: db_client.admins.find_one({"user": user_db_data["_id"]})
    )
    if not admin_data:
        raise HTTPException(status_code=403,
                            detail="Solo los admin pueden modificar canchas")
    nuevo_nombre = data.get("nombre")
    if not nuevo_nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    # Validar nombre único
    if db_client.canchas.find_one({"nombre": nuevo_nombre, "_id": {
                                  "$ne": ObjectId(cancha_id)}}):
        raise HTTPException(status_code=400,
                            detail="Ya existe una cancha con ese nombre")
    result = db_client.canchas.update_one(
        {"_id": ObjectId(cancha_id)},
        {"$set": {"nombre": nuevo_nombre}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    print("DATA RECIBIDA:", data)
    print("ID:", cancha_id)
    print("NUEVO NOMBRE:", nuevo_nombre)
    return {"msg": "Cancha modificada"}
