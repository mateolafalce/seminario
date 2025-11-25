from typing import List, Optional
from pydantic import BaseModel, Field


class CanchaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = Field(default="", max_length=1000)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    # NUEVO: imágenes secundarias
    imagenes: Optional[List[str]] = Field(default=None)
    habilitada: Optional[bool] = Field(default=True)
    # ids de horarios (ObjectId en string)
    horarios: Optional[List[str]] = Field(default=None)


class CanchaUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    # NUEVO: imágenes secundarias
    imagenes: Optional[List[str]] = Field(default=None)
    habilitada: Optional[bool] = Field(default=None)
    horarios: Optional[List[str]] = Field(default=None)
