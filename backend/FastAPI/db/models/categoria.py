from pydantic import BaseModel, Field
from typing import Optional

class CategoriaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=40)
    nivel: int = Field(..., ge=1, le=100)  # ordinal 1..100 (ajustá a gusto)

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=40)
    nivel: Optional[int] = Field(None, ge=1, le=100)

class CategoriaOut(BaseModel):
    id: str
    nombre: str
    nivel: int
