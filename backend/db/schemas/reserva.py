from typing import Any, Dict, List, Optional
from bson import ObjectId

def _to_str_ids(x: Any) -> Any:
    """Convierte ObjectId → str en todo el documento (listas/dicts anidados)."""
    if isinstance(x, ObjectId):
        return str(x)
    if isinstance(x, list):
        return [_to_str_ids(i) for i in x]
    if isinstance(x, dict):
        return {k: _to_str_ids(v) for k, v in x.items()}
    return x

def reserva_schema_db(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    return _to_str_ids(doc)

def reservas_schema_db(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [reserva_schema_db(r) for r in rows if r]
