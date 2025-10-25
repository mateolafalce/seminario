from typing import Optional
from pydantic import BaseModel, Field, EmailStr

# ====== Payload de registro (Persona + Cuenta) ======
# lo usas en POST /users_b/register
class RegisterUser(BaseModel):
    # Persona
    nombre: str
    apellido: str
    email: EmailStr
    dni: str = Field(..., pattern=r"^\d{7,8}$")  # 7–8 dígitos, obligatorio
    # Cuenta
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6)

# ====== Modelos de "cuenta" de usuario (sin datos personales) ======
class UserAccountBase(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    persona: str                     # ObjectId (string) a colección personas
    habilitado: bool = False
    categoria: Optional[str] = None  # ObjectId (string) o None

class UserCreate(UserAccountBase):
    password: str = Field(min_length=6)
    # Útil si alguna vez das de alta un usuario apuntando a una Persona existente

class UserPublic(UserAccountBase):
    id: Optional[str] = None
    # Para respuestas “públicas” (sin password/salt)

class UserInDB(UserAccountBase):
    id: Optional[str] = None
    password: str
    salt: str
    fecha_registro: Optional[str] = None       # "YYYY-MM-DD HH:mm:ss"
    ultima_conexion: Optional[str] = None
    habilitacion_token: Optional[str] = None

# ====== Aliases de compatibilidad (si aún hay imports antiguos) ======
# Si en algún punto tenías: `from db.models.user import User, UserDB`
# podés mantener esto mientras migrás tus routers.
class User(UserPublic):
    pass

class UserDB(UserInDB):
    pass
