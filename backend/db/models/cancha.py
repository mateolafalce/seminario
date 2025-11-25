from typing import List, Optional
from pydantic import BaseModel, Field

class CanchaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = Field(default="", max_length=1000)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    imagenes: Optional[List[str]] = Field(default=None)
    habilitada: Optional[bool] = Field(default=True)
    horarios: Optional[List[str]] = Field(default=None)
    capacidad_maxima: Optional[int] = Field(default=6, ge=1, le=50)
    dias_semana: Optional[List[int]] = Field(default=None)
    fechas_bloqueadas: Optional[List[str]] = Field(default=None)


class CanchaUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    imagenes: Optional[List[str]] = Field(default=None)
    habilitada: Optional[bool] = Field(default=None)
    horarios: Optional[List[str]] = Field(default=None)
    capacidad_maxima: Optional[int] = Field(default=None, ge=1, le=50)
    dias_semana: Optional[List[int]] = Field(default=None)
    fechas_bloqueadas: Optional[List[str]] = Field(default=None)
