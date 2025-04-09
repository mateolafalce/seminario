### User model ###
from pydantic import BaseModel #permite generar el modelo de forma sencilla
from typing import Optional #al hacer el post, el campo id no es obligatorio (no se rompe el programa)


class User(BaseModel):
    id: Optional[str]
    username: str
    email: str

class UserDB(User):
    password: str
