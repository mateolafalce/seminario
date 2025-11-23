from pydantic import BaseModel, Field
from typing import List, Optional


class CanchaCreate(BaseModel):
    """
    Modelo para crear una cancha desde la API.
    - nombre: obligatorio
    - descripcion: opcional
    - imagen_url: opcional
    - habilitada: opcional (default True)
    - horarios: lista opcional de IDs de horarios (str)
    """
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = Field(
        default="",
        max_length=1000,
        description="Descripción corta / texto libre de la cancha",
    )
    imagen_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="URL de imagen representativa de la cancha",
    )
    habilitada: Optional[bool] = Field(
        default=True,
        description="Si está habilitada para reservarse",
    )
    horarios: Optional[List[str]] = Field(
        default=None,
        description="Lista de IDs (str) de horarios habilitados para esta cancha",
    )


class CanchaUpdate(BaseModel):
    """
    Modelo para modificar una cancha.
    Los campos son opcionales para permitir actualizar sólo algunos.
    """
    nombre: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    descripcion: Optional[str] = Field(
        default=None,
        max_length=1000,
    )
    imagen_url: Optional[str] = Field(
        default=None,
        max_length=500,
    )
    habilitada: Optional[bool] = Field(default=None)
    horarios: Optional[List[str]] = Field(
        default=None,
        description="Lista de IDs (str) de horarios habilitados para esta cancha",
    )
