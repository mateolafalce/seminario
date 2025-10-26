from fastapi import APIRouter, HTTPException, Depends, Body
from db.client import db_client
from bson import ObjectId
import asyncio
from db.models.cancha import CanchaCreate, CanchaUpdate
from db.schemas.cancha import canchas_schema
from routers.Security.auth import verify_csrf, require_perms  # <- cambia si querés dejar require_roles

router = APIRouter(prefix="/canchas", tags=["Canchas"])

@router.post(
    "/crear",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.gestionar"))]
)
async def crear_cancha(cancha: CanchaCreate):
    nombre = (cancha.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")

    exists = await asyncio.to_thread(lambda: db_client.canchas.find_one({"nombre": nombre}))
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe una cancha con ese nombre")

    result = await asyncio.to_thread(lambda: db_client.canchas.insert_one({"nombre": nombre}))
    return {"msg": "Cancha creada con éxito", "id": str(result.inserted_id)}

@router.get("/listar")
async def listar_canchas():
    rows = await asyncio.to_thread(lambda: list(db_client.canchas.find({}, sort=[("nombre", 1)])))
    return canchas_schema(rows)

@router.delete(
    "/eliminar/{cancha_id}",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.gestionar"))]
)
async def eliminar_cancha(cancha_id: str):
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(status_code=400, detail="ID de cancha inválido")
    cancha_oid = ObjectId(cancha_id)

    def operaciones_sincronas():
        cancha = db_client.canchas.find_one({"_id": cancha_oid})
        if not cancha:
            raise ValueError("Cancha no encontrada")

        # 1) Cancelar recordatorios
        reservas = list(db_client.reservas.find({"cancha": cancha_oid}, {"_id": 1}))
        reserva_ids = [r["_id"] for r in reservas]
        for r in reservas:
            try:
                from services.scheduler import cancelar_recordatorio_reserva
                cancelar_recordatorio_reserva(str(r["_id"]))
            except Exception as e:
                print(f"Error cancelando recordatorio de reserva {r['_id']}: {e}")

        # 2) Eliminar notif_logs de esas reservas (si corresponde)
        if reserva_ids:
            db_client.notif_logs.delete_many({"reserva": {"$in": reserva_ids}})

        # 3) Eliminar reservas de esta cancha
        result_reservas = db_client.reservas.delete_many({"cancha": cancha_oid})

        # 4) Quitar cancha de preferencias
        result_prefs = db_client.preferencias.update_many(
            {"canchas": cancha_oid},
            {"$pull": {"canchas": cancha_oid}}
        )
        # 5) Eliminar preferencias vacías
        result_prefs_vacias = db_client.preferencias.delete_many({"canchas": {"$size": 0}})

        # 6) Finalmente, eliminar la cancha
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
        return {"msg": "Cancha y datos asociados eliminados correctamente", "detalles": resultado}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar cancha: {str(e)}")

@router.put(
    "/modificar/{cancha_id}",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.gestionar"))]
)
async def modificar_cancha(cancha_id: str, data: CanchaUpdate = Body(...)):
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(status_code=400, detail="ID de cancha inválido")
    nombre = (data.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")

    cancha_oid = ObjectId(cancha_id)

    # nombre único (excluye la propia)
    exists = await asyncio.to_thread(
        lambda: db_client.canchas.find_one({"nombre": nombre, "_id": {"$ne": cancha_oid}})
    )
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe una cancha con ese nombre")

    result = await asyncio.to_thread(
        lambda: db_client.canchas.update_one({"_id": cancha_oid}, {"$set": {"nombre": nombre}})
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    return {"msg": "Cancha modificada"}
