from fastapi import APIRouter, Query
from db.client import db_client
# si querés usar el schema para el shape nuevo:
from db.schemas.horario import horarios_schema

router = APIRouter(prefix="/horarios", tags=["horarios"])

@router.get("/listar")
async def listar_horarios(
    # de True -> a False
    simple: bool = Query(False, description="True => [{hora}] (legacy). False => [{id,hora}] (nuevo).")
):
    if simple:
        # === SHAPE VIEJO (compat - lo que tu front ya usa) ===
        rows = list(db_client.horarios.find({}, {"_id": 0, "hora": 1}).sort("hora", 1))
        return rows

    # === SHAPE NUEVO (recomendado) ===
    rows = list(db_client.horarios.find({}, {"hora": 1}).sort("hora", 1))
    # con schema (id + hora):
    return horarios_schema(rows)
    # si no querés usar el schema, también sirve:
    # return [{"id": str(r["_id"]), "hora": r.get("hora", "")} for r in rows]
