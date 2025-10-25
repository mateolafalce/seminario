from pydantic import BaseModel
from typing import List, Optional

class PreferenciaCreate(BaseModel):
    # Mantenemos el contrato actual: listas de NOMBRES ("Lunes", "09:00-10:30", "Cancha 1")
    dias: List[str]
    horarios: List[str]
    canchas: List[str]

class PreferenciaUpdate(BaseModel):
    dias: Optional[List[str]] = None
    horarios: Optional[List[str]] = None
    canchas: Optional[List[str]] = None

class PreferenciaDB(BaseModel):
    # Útil si querés tipar lecturas de DB (ids en str)
    id: Optional[str] = None
    usuario_id: str
    dias: List[str]       # ids (string) en la respuesta DB-like
    horarios: List[str]
    canchas: List[str]
