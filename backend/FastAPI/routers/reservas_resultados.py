from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import require_perms

# Router “por dominio”
router = APIRouter(
    prefix="/reservas/resultados",
    tags=["Resultados de reservas"],
    responses={status.HTTP_400_BAD_REQUEST: {"message": "Solicitud inválida"}}
)

class CargarResultadoRequest(BaseModel):
    reserva_id: str
    resultado: str

def _get_reserva_or_404(reserva_id: str):
    if not ObjectId.is_valid(reserva_id):
        raise HTTPException(status_code=400, detail="ID de reserva inválido")
    r = db_client.reservas.find_one({"_id": ObjectId(reserva_id)})
    if not r:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return r

@router.post("/cargar", dependencies=[Depends(require_perms("reservas.resultado.cargar"))])
async def cargar_resultado(payload: CargarResultadoRequest):
    _get_reserva_or_404(payload.reserva_id)
    res = db_client.reservas.update_one(
        {"_id": ObjectId(payload.reserva_id)},
        {"$set": {"resultado": payload.resultado}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="No se pudo actualizar la reserva")
    return {"message": "Resultado cargado correctamente"}

@router.get("/{reserva_id}", dependencies=[Depends(require_perms("reservas.resultado.ver"))])
async def obtener_resultado(reserva_id: str):
    r = _get_reserva_or_404(reserva_id)
    return {"resultado": r.get("resultado", "")}

# --- Compatibilidad temporal (opcional) ---
# Conserva las rutas antiguas /empleado/* apuntando a lo mismo
router_compat = APIRouter(prefix="/empleado", tags=["empleado"])

@router_compat.post(
    "/cargar_resultado", 
    dependencies=[Depends(require_perms("reservas.resultado.cargar"))],
    include_in_schema=False
)
async def _cargar_resultado_compat(payload: CargarResultadoRequest):
    return await cargar_resultado(payload)

@router_compat.get(
    "/resultado/{reserva_id}",
    dependencies=[Depends(require_perms("reservas.resultado.ver"))],
    include_in_schema=False
)
async def _obtener_resultado_compat(reserva_id: str):
    return await obtener_resultado(reserva_id)
