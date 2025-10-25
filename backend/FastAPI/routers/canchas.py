from fastapi import APIRouter, HTTPException, Depends, Body
from db.client import db_client
from routers.Security.auth import current_user
from bson import ObjectId
import asyncio
from db.models.cancha import CanchaCreate, CanchaUpdate
from db.schemas.cancha import cancha_schema, canchas_schema

router = APIRouter(prefix="/canchas", tags=["Canchas"])

# Helper para validar admin (evita duplicar la misma lógica en cada endpoint)
async def require_admin(user=Depends(current_user)) -> ObjectId:
    user_id = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    user_oid = ObjectId(user_id)

    user_db = await asyncio.to_thread(lambda: db_client.users.find_one({"_id": user_oid}))
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    admin = await asyncio.to_thread(lambda: db_client.admins.find_one({"user": user_oid}))
    if not admin:
        raise HTTPException(status_code=403, detail="Solo los admin pueden realizar esta acción")
    return user_oid

@router.post("/crear")
async def crear_cancha(cancha: CanchaCreate, _: ObjectId = Depends(require_admin)):
    # nombre único
    exists = await asyncio.to_thread(lambda: db_client.canchas.find_one({"nombre": cancha.nombre}))
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe una cancha con ese nombre")

    result = await asyncio.to_thread(lambda: db_client.canchas.insert_one({"nombre": cancha.nombre}))
    return {"msg": "Cancha creada con éxito", "id": str(result.inserted_id)}

@router.get("/listar")
async def listar_canchas(user: dict = Depends(current_user)):
    rows = await asyncio.to_thread(lambda: list(db_client.canchas.find()))
    return canchas_schema(rows)

@router.delete("/eliminar/{cancha_id}")
async def eliminar_cancha(cancha_id: str, _: ObjectId = Depends(require_admin)):
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(status_code=400, detail="ID de cancha inválido")
    cancha_oid = ObjectId(cancha_id)

    def operaciones_sincronas():
        cancha = db_client.canchas.find_one({"_id": cancha_oid})
        if not cancha:
            raise ValueError("Cancha no encontrada")

        # 1) Cancelar recordatorios de reservas asociadas
        reservas = list(db_client.reservas.find({"cancha": cancha_oid}, {"_id": 1}))
        for r in reservas:
            try:
                from services.scheduler import cancelar_recordatorio_reserva
                cancelar_recordatorio_reserva(str(r["_id"]))
            except Exception as e:
                print(f"Error cancelando recordatorio de reserva {r['_id']}: {e}")

        # 2) Eliminar reservas de esta cancha
        result_reservas = db_client.reservas.delete_many({"cancha": cancha_oid})
        print(f"🗑️ Reservas eliminadas: {result_reservas.deleted_count}")

        # 3) Quitar cancha de preferencias
        result_prefs = db_client.preferencias.update_many(
            {"canchas": cancha_oid},
            {"$pull": {"canchas": cancha_oid}}
        )
        print(f"📝 Preferencias actualizadas (cancha removida): {result_prefs.modified_count}")

        # 4) Eliminar preferencias vacías
        result_prefs_vacias = db_client.preferencias.delete_many({"canchas": {"$size": 0}})
        print(f"🗑️ Preferencias vacías eliminadas: {result_prefs_vacias.deleted_count}")

        # 5) Finalmente, eliminar la cancha
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
        return {"msg": "Cancha y todos sus datos asociados eliminados correctamente", "detalles": resultado}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar cancha: {str(e)}")

@router.put("/modificar/{cancha_id}")
async def modificar_cancha(
    cancha_id: str,
    data: CanchaUpdate = Body(...),
    _: ObjectId = Depends(require_admin)
):
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(status_code=400, detail="ID de cancha inválido")
    if not data.nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")

    cancha_oid = ObjectId(cancha_id)

    # nombre único (excluyendo la propia)
    exists = await asyncio.to_thread(
        lambda: db_client.canchas.find_one({"nombre": data.nombre, "_id": {"$ne": cancha_oid}})
    )
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe una cancha con ese nombre")

    result = await asyncio.to_thread(
        lambda: db_client.canchas.update_one({"_id": cancha_oid}, {"$set": {"nombre": data.nombre}})
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    return {"msg": "Cancha modificada"}
