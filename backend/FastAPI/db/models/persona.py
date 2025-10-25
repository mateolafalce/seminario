from pydantic import BaseModel, EmailStr, Field

class PersonaBase(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    dni: str = Field(..., pattern=r"^\d{7,8}$")  # obligatorio

class PersonaCreate(PersonaBase):
    pass

class PersonaUpdate(BaseModel):
    # Para ediciones parciales (si querés permitir cambiar DNI, dejalo aquí también)
    nombre: str | None = None
    apellido: str | None = None
    email: EmailStr | None = None
    dni: str | None = Field(None, pattern=r"^\d{7,8}$")

class PersonaOut(PersonaBase):
    id: str
