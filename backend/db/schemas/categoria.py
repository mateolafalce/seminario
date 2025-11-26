from typing import Any, Dict, List

def categoria_schema(c: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza un documento de la colección 'categorias' para el frontend.
    Acepta tanto {"_id": ObjectId(...)} como {"id": "..."}.
    """
    if not c:
        return {}

    _id = c.get("_id") or c.get("id")
    nivel_val = c.get("nivel", c.get("orden", 0))

    try:
        nivel_int = int(nivel_val) if nivel_val is not None else 0
    except (TypeError, ValueError):
        nivel_int = 0

    return {
        "id": str(_id) if _id is not None else None,
        "nombre": c.get("nombre", ""),
        "nivel": nivel_int,
    }


def categorias_schema(cats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [categoria_schema(c) for c in cats]
