from typing import Optional
from pydantic import BaseModel, Field, EmailStr

class RegisterUser(BaseModel):
    # Persona
    nombre: str
    apellido: str
    email: EmailStr
    dni: str = Field(..., pattern=r"^\d{7,8}$")  # 7–8 dígitos, obligatorio
    # Cuenta
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6)

class UserAccountBase(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    persona: str                   
    habilitado: bool = False
    categoria: Optional[str] = None  

class UserCreate(UserAccountBase):
    password: str = Field(min_length=6)


class UserPublic(UserAccountBase):
    id: Optional[str] = None

class UserInDB(UserAccountBase):
    id: Optional[str] = None
    password: str
    salt: str
    fecha_registro: Optional[str] = None       # "YYYY-MM-DD HH:mm:ss"
    ultima_conexion: Optional[str] = None
    habilitacion_token: Optional[str] = None

class User(UserPublic):
    pass

class UserDB(UserInDB):
    pass
