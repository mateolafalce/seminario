from pydantic import BaseModel, Field
from typing import Optional

class CanchaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class CanchaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
