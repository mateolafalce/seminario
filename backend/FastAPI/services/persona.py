from typing import Dict, Any
from bson import ObjectId
from db.client import db_client
from pymongo.errors import DuplicateKeyError


def ensure_persona_indexes() -> None:
    """
    DNI único; email indexado (no único).
    """
    try:
        db_client.personas.create_index([("dni", 1)], unique=True, name="personas_dni_unique")
    except Exception:
        pass
    try:
        db_client.personas.create_index([("email", 1)], name="personas_email_1")
    except Exception:
        pass

def _only_digits(s: Any) -> str:
    return "".join(ch for ch in str(s) if ch.isdigit())


def create_persona_for_user(nombre: str, apellido: str, email: str, dni: str) -> ObjectId:
    """
    Crea un documento en 'personas' con validación laxa.
    Devuelve el ObjectId insertado. Lanza ValueError ante errores de negocio.
    """
    if not nombre or not apellido:
        raise ValueError("Nombre y apellido son requeridos")
    if not email or "@" not in email:
        raise ValueError("Email inválido")

    ndni = _only_digits(dni)
    # LAXO: 1 a 10 dígitos
    if len(ndni) < 1 or len(ndni) > 10:
        raise ValueError("DNI inválido: debe tener entre 1 y 10 dígitos")

    ensure_persona_indexes()

    doc = {
        "nombre": (nombre or "").strip(),
        "apellido": (apellido or "").strip(),
        "email": (email or "").strip(),
        "dni": ndni,
    }
    try:
        res = db_client.personas.insert_one(doc)
    except DuplicateKeyError:
        # Índice único por DNI
        raise ValueError("DNI ya registrado")
    return res.inserted_id

def update_persona_fields(persona_id: ObjectId, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Actualiza en 'personas' solo los campos presentes en 'data'.
    Normaliza DNI a dígitos. Devuelve la persona actualizada.
    """
    update: Dict[str, Any] = {}

    def _clean(s):
        return s.strip() if isinstance(s, str) else s

    if "nombre" in data and data["nombre"] is not None:
        update["nombre"] = _clean(data["nombre"])
    if "apellido" in data and data["apellido"] is not None:
        update["apellido"] = _clean(data["apellido"])
    if "email" in data and data["email"] is not None:
        update["email"] = _clean(data["email"])

    if "dni" in data and data["dni"] is not None:
        ndni = _only_digits(data["dni"])
        # LAXO: 1 a 10 dígitos
        if len(ndni) < 1 or len(ndni) > 10:
            raise ValueError("DNI inválido: debe tener entre 1 y 10 dígitos")
        update["dni"] = ndni

    if not update:
        # Nada que actualizar
        doc = db_client.personas.find_one({"_id": persona_id})
        if not doc:
            raise ValueError("Persona no encontrada")
        return doc

    try:
        db_client.personas.update_one({"_id": persona_id}, {"$set": update})
    except DuplicateKeyError:
        # Índice único por DNI
        raise ValueError("DNI ya registrado")

    doc = db_client.personas.find_one({"_id": persona_id})
    if not doc:
        raise ValueError("Persona no encontrada tras actualizar")
    return doc
