from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from db.client import db_client
from db.schemas.horario import horarios_schema
from routers.Security.auth import verify_csrf
from routers.Security.auth import current_user  
from routers.Security.auth import require_roles

router = APIRouter(prefix="/horarios", tags=["horarios"])

@router.get("/listar")
async def listar_horarios(
    simple: bool = Query(False, description="True => [{hora}] (legacy). False => [{id,hora}] (nuevo).")
):
    if simple:
        rows = list(db_client.horarios.find({}, {"_id": 0, "hora": 1}).sort("hora", 1))
        return rows
    rows = list(db_client.horarios.find({}, {"hora": 1}).sort("hora", 1))
    return horarios_schema(rows)

@router.post("/crear", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def crear_horario(payload: dict):
    hora = (payload.get("hora") or "").strip()
    if not hora or "-" not in hora:
        raise HTTPException(status_code=400, detail="Formato de horario inválido (esperado HH:MM-HH:MM)")
    if db_client.horarios.find_one({"hora": hora}):
        raise HTTPException(status_code=400, detail="Ya existe un horario con esa franja")
    res = db_client.horarios.insert_one({"hora": hora})
    return {"msg": "Horario creado", "id": str(res.inserted_id)}

@router.put("/modificar/{horario_id}", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def modificar_horario(horario_id: str, payload: dict):
    if not ObjectId.is_valid(horario_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    hora = (payload.get("hora") or "").strip()
    if not hora or "-" not in hora:
        raise HTTPException(status_code=400, detail="Formato de horario inválido (esperado HH:MM-HH:MM)")
    if db_client.horarios.find_one({"hora": hora, "_id": {"$ne": ObjectId(horario_id)}}):
        raise HTTPException(status_code=400, detail="Ya existe un horario con esa franja")
    upd = db_client.horarios.update_one({"_id": ObjectId(horario_id)}, {"$set": {"hora": hora}})
    if upd.matched_count == 0:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return {"msg": "Horario modificado"}

@router.delete("/eliminar/{horario_id}", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def eliminar_horario(horario_id: str):
    if not ObjectId.is_valid(horario_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    oid = ObjectId(horario_id)

    # 1. Eliminar todas las reservas que usan este horario
    espacios_eliminados = db_client.reservas.delete_many({"hora_inicio": oid})
    
    # 2. Eliminar el horario de todas las preferencias que lo referencien
    db_client.preferencias.update_many(
        {"horarios": oid},
        {"$pull": {"horarios": oid}}
    )
    
    # 3. Eliminar preferencias que se quedaron sin horarios
    preferencias_eliminadas = db_client.preferencias.delete_many(
        {"horarios": {"$size": 0}}
    )

    # 3b. Sacar el horario de todas las canchas que lo tengan configurado
    canchas_actualizadas = db_client.canchas.update_many(
        {"horarios": oid},
        {"$pull": {"horarios": oid}}
    )

    # 4. Finalmente, eliminar el horario
    res = db_client.horarios.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    
    return {
        "msg": "Horario eliminado con borrado en cascada",
        "reservas_eliminadas": espacios_eliminados.deleted_count,
        "preferencias_eliminadas": preferencias_eliminadas.deleted_count,
        "canchas_actualizadas": canchas_actualizadas.modified_count,
    }

def ensure_horarios_indexes():
    from pymongo import ASCENDING
    db_client.horarios.create_index([("hora", ASCENDING)], unique=True, name="hora_1_unique")
