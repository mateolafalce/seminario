from fastapi import APIRouter, Depends, HTTPException, status, Body
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/empleado",
    tags=["empleado"],
    responses={status.HTTP_400_BAD_REQUEST: {"message": "No encontrado"}}
)

def es_empleado(user_id: str):
    """Verifica si el usuario es empleado"""
    return db_client.empleados.find_one({"user": ObjectId(user_id)}) is not None

class CargarResultadoRequest(BaseModel):
    reserva_id: str
    resultado: str

@router.post("/cargar_resultado")
async def cargar_resultado(
    data: CargarResultadoRequest,
    user: dict = Depends(current_user)
):
    # Verificar si el usuario es empleado
    if not es_empleado(user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo empleados pueden cargar resultados"
        )
    # Verificar que la reserva existe
    reserva = db_client.reservas.find_one({"_id": ObjectId(data.reserva_id)})
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    # Actualizar el resultado
    result = db_client.reservas.update_one(
        {"_id": ObjectId(data.reserva_id)},
        {"$set": {"resultado": data.resultado}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No se pudo actualizar la reserva")
    return {"message": "Resultado cargado correctamente"}

@router.get("/resultado/{reserva_id}")
async def obtener_resultado_reserva(
    reserva_id: str,
    user: dict = Depends(current_user)
):
    # Verificar si el usuario es empleado
    if not es_empleado(user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo empleados pueden consultar resultados"
        )
    if not ObjectId.is_valid(reserva_id):
        raise HTTPException(status_code=400, detail="ID de reserva inválido")
    reserva = db_client.reservas.find_one({"_id": ObjectId(reserva_id)})
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return {"resultado": reserva.get("resultado", "")}