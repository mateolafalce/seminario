from fastapi import APIRouter
from db.client import db_client

router = APIRouter(prefix="/horarios", tags=["horarios"])

@router.get("/listar")
async def listar_horarios():
    horarios = list(db_client.horarios.find({}, {"_id": 0, "hora": 1}))
    return horarios