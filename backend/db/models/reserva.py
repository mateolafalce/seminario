from pydantic import BaseModel, Field
from typing import List, Optional

class ReservaUsuarioRef(BaseModel):
    id: str
    confirmado: bool = False  # si no lo usás, igual lo dejamos opcional y backward-compatible

class ReservaCreate(BaseModel):
    # Mantenemos los nombres que hoy usa tu front/routers
    cancha: str                # ej: "Cancha 1" (tu router hoy busca por nombre)
    horario: str               # ej: "20:00-21:00" (tu router hoy busca por hora)
    fecha: str                 # ej: "24-10-2025" (o "DD-MM-YYYY")
    usuarios: List[ReservaUsuarioRef] = Field(default_factory=list)

# Opcional: tipar la forma típica de salida
class ReservaPublic(BaseModel):
    id: Optional[str] = None
    fecha: str
    cancha: str
    horario: str
    usuarios: List[ReservaUsuarioRef] = []
    estado: Optional[str] = None
    resultado: Optional[str] = None
