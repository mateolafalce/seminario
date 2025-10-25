from typing import Iterable, List, Dict, Any, Optional

def _str(obj) -> Optional[str]:
    try:
        from bson import ObjectId
        if isinstance(obj, ObjectId):
            return str(obj)
    except Exception:
        pass
    return str(obj) if obj is not None else None


# ==============================
# Serializadores de Usuario (cuenta)
# ==============================
def user_schema(user: Dict[str, Any]) -> Optional[dict]:
    """
    Forma pública de usuario (solo datos de la cuenta).
    No incluye password/salt. Incluye referencia a 'persona'.
    """
    if not user:
        return None
    return {
        "id": _str(user.get("_id")),
        "username": user.get("username"),
        "habilitado": bool(user.get("habilitado", False)),
        "persona": _str(user.get("persona")),
        "categoria": _str(user.get("categoria")) if user.get("categoria") else None,
        "fecha_registro": user.get("fecha_registro"),
        "ultima_conexion": user.get("ultima_conexion"),
    }


def user_schema_db(user: Dict[str, Any]) -> Optional[dict]:
    """
    Forma 'interna/admin' de usuario.
    Incluye password/salt/habilitacion_token.
    """
    if not user:
        return None
    out = user_schema(user)
    out.update({
        "password": user.get("password"),
        "salt": user.get("salt"),
        "habilitacion_token": user.get("habilitacion_token"),
    })
    return out


def users_schema(users: Iterable[Dict[str, Any]]) -> List[dict]:
    return [user_schema(u) for u in (users or [])]


# ==============================
# Helper para “JOIN lógico” con Persona
# (cuando quieras responder user + datos personales en una sola respuesta)
# ==============================
def user_with_persona_schema(user: Dict[str, Any], persona: Optional[Dict[str, Any]]) -> dict:
    """
    Une datos de la cuenta (user) + datos personales (persona).
    Útil para /users_b/me o vistas admin.
    """
    base = user_schema(user) or {}
    if persona:
        base.update({
            "nombre": persona.get("nombre"),
            "apellido": persona.get("apellido"),
            "email": persona.get("email"),
            "dni": persona.get("dni"),
        })
    return base
