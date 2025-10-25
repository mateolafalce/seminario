from bson import ObjectId
from db.client import db_client
from pymongo.errors import DuplicateKeyError

def ensure_persona_indexes():
    from pymongo import ASCENDING
    # Como DNI es obligatorio, no usamos 'sparse'
    db_client.personas.create_index([("dni", ASCENDING)], unique=True, name="personas_dni_unique")
    db_client.personas.create_index([("email", ASCENDING)], name="personas_email_1")

def _only_digits(s: str) -> str:
    return "".join(ch for ch in s if ch.isdigit())

def create_persona_for_user(nombre: str, apellido: str, email: str, dni: str) -> ObjectId:
    """Crea persona con DNI obligatorio (único). Devuelve _id o levanta error si existe."""
    ndni = _only_digits(str(dni))
    if not ndni or len(ndni) not in (7, 8):
        raise ValueError("DNI inválido (se esperan 7 u 8 dígitos)")
    try:
        res = db_client.personas.insert_one({
            "nombre": nombre.strip(),
            "apellido": apellido.strip(),
            "email": email.strip(),
            "dni": ndni,
        })
        return res.inserted_id
    except DuplicateKeyError:
        # Ya existe una persona con ese DNI
        raise ValueError("DNI ya registrado")
