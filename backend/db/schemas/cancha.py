from typing import Any, Dict, Iterable, List


def cancha_schema(cancha: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el documento de cancha para enviarlo al frontend.
    Incluye:
      - id (str)
      - nombre (str)
      - descripcion (str, opcional)
      - imagen_url (str, opcional)
      - habilitada (bool, default True)
      - horarios: lista de ids de horarios (str)
    """
    if not cancha:
        return {}

    horarios = cancha.get("horarios") or []

    return {
        "id": str(cancha.get("_id")),
        "nombre": cancha.get("nombre", ""),
        "descripcion": cancha.get("descripcion", "") or "",
        "imagen_url": cancha.get("imagen_url", "") or "",
        "habilitada": bool(cancha.get("habilitada", True)),
        "horarios": [str(h) for h in horarios],
    }


def canchas_schema(canchas: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [cancha_schema(c) for c in (canchas or [])]
