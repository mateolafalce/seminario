from pydantic import BaseModel, Field
from typing import Optional

class ReseniaCreate(BaseModel):
    # i = autor viene del token, NO lo pide el front
    con: str  # j (usuario a reseñar) -> users._id (string)
    calificacion: str  # puede venir como ObjectId de calificaciones o como "1".."5"
    observacion: str = Field(..., min_length=3, max_length=500)
    reserva_id: Optional[str] = None  # opcional (para validar contra esa reserva)
