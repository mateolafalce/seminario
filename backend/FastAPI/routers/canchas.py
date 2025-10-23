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
    
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(status_code=400, detail="ID de cancha inválido")
    
    cancha_oid = ObjectId(cancha_id)
    
    def operaciones_sincronas():
        # Verificar que la cancha existe
        cancha = db_client.canchas.find_one({"_id": cancha_oid})
        if not cancha:
            raise ValueError("Cancha no encontrada")
        
        # === ELIMINACIÓN EN CASCADA ===
        
        # 1. Eliminar reservas asociadas a esta cancha
        reservas_eliminadas = db_client.reservas.find({"cancha": cancha_oid})
        
        # Cancelar recordatorios de las reservas antes de eliminarlas
        for reserva in reservas_eliminadas:
            try:
                from services.scheduler import cancelar_recordatorio_reserva
                cancelar_recordatorio_reserva(str(reserva["_id"]))
            except Exception as e:
                print(f"Error cancelando recordatorio de reserva {reserva['_id']}: {e}")
        
        # Eliminar todas las reservas de esta cancha
        result_reservas = db_client.reservas.delete_many({"cancha": cancha_oid})
        print(f"🗑️ Reservas eliminadas: {result_reservas.deleted_count}")
        
        # 2. Eliminar la cancha de las preferencias de los usuarios
        # Actualizar preferencias que incluyen esta cancha
        result_prefs = db_client.preferencias.update_many(
            {"canchas": cancha_oid},
            {"$pull": {"canchas": cancha_oid}}
        )
        print(f"📝 Preferencias actualizadas (cancha removida): {result_prefs.modified_count}")
        
        # 3. Eliminar preferencias que quedan sin canchas (opcional pero recomendado)
        # Si una preferencia se queda sin canchas, no tiene sentido mantenerla
        result_prefs_vacias = db_client.preferencias.delete_many({"canchas": {"$size": 0}})
        print(f"🗑️ Preferencias vacías eliminadas: {result_prefs_vacias.deleted_count}")
        
        # 4. Finalmente, eliminar la cancha
        result = db_client.canchas.delete_one({"_id": cancha_oid})
        if result.deleted_count == 0:
            raise ValueError("Error al eliminar la cancha")
        
        return {
            "cancha_eliminada": True,
            "reservas_eliminadas": result_reservas.deleted_count,
            "preferencias_actualizadas": result_prefs.modified_count,
            "preferencias_vacias_eliminadas": result_prefs_vacias.deleted_count
        }
    
    try:
        resultado = await asyncio.to_thread(operaciones_sincronas)
        return {
            "msg": "Cancha y todos sus datos asociados eliminados correctamente",
            "detalles": resultado
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar cancha: {str(e)}"
        )


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
