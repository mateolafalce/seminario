from typing import Any, Dict, List, Optional
from bson import ObjectId

def _to_str_ids(x: Any) -> Any:
    if isinstance(x, ObjectId):
        return str(x)
    if isinstance(x, list):
        return [_to_str_ids(i) for i in x]
    if isinstance(x, dict):
        return {k: _to_str_ids(v) for k, v in x.items()}
    return x

def preferencia_schema_db(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    return _to_str_ids(doc)

def preferencias_schema_db(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [preferencia_schema_db(r) for r in rows if r]

def preferencia_schema_ui(doc: Dict[str, Any],
                          dias_map_id2name: Dict[Any, str],
                          horarios_map_id2name: Dict[Any, str],
                          canchas_map_id2name: Dict[Any, str]) -> Dict[str, Any]:
    """
    Convierte una preferencia con ObjectIds en listas de NOMBRES para el front.
    Requiere los mapas _id -> nombre/hora pre-cargados (router).
    """
    return {
        "id": str(doc["_id"]),
        "dias": [dias_map_id2name.get(d, str(d)) for d in (doc.get("dias") or [])],
        "horarios": [horarios_map_id2name.get(h, str(h)) for h in (doc.get("horarios") or [])],
        "canchas": [canchas_map_id2name.get(c, str(c)) for c in (doc.get("canchas") or [])],
    }
