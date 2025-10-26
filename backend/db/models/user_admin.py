from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class AdminBuscarUsuariosRequest(BaseModel):
    nombre: str = Field(..., min_length=1)

class AdminModificarUsuarioRequest(BaseModel):
    identificador: str
    # Campos de persona que el admin puede editar:
    nombre: str
    apellido: str
    email: EmailStr
    # Flags/props del user (no personales):
    habilitado: bool
    categoria: Optional[str] = None  # "Sin categoría" | "" | nombre

class AdminEliminarUsuarioRequest(BaseModel):
    identificador: str
