from pydantic import BaseModel
from typing import Optional


class User(BaseModel):
    id: Optional[str] = None
    nombre: str
    apellido: str
    username: str
    telefono: str 


class UserDB(User):
    password: str
