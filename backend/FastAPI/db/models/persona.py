from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class PersonaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=60)
    apellido: Optional[str] = Field(None, min_length=1, max_length=60)
    email: Optional[EmailStr] = None
    dni: Optional[str] = Field(None, pattern=r"^\d{7,8}$")
