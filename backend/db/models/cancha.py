from pydantic import BaseModel, Field
from typing import Optional, List

class CanchaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    # IDs de horarios (ObjectId en string) habilitados para esta cancha
    horarios: Optional[List[str]] = Field(
        default=None,
        description="Lista de IDs de horarios habilitados para esta cancha"
    )

class CanchaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    # Si viene None => no se tocan horarios, si viene lista => se reemplaza
    horarios: Optional[List[str]] = Field(
        default=None,
        description="Lista de IDs de horarios habilitados para esta cancha"
    )
