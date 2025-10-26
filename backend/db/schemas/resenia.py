from typing import Any, Dict, List, Optional
from bson import ObjectId

def _to_str_ids(x: Any) -> Any:
    if isinstance(x, ObjectId): return str(x)
    if isinstance(x, list):     return [_to_str_ids(i) for i in x]
    if isinstance(x, dict):     return {k: _to_str_ids(v) for k, v in x.items()}
    return x

def resenia_schema_db(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Pasa un doc 'crudo' de Mongo a dict con ids en string (si alguna vez lo necesitás)."""
    if not doc: return None
    return _to_str_ids(doc)

def calificaciones_schema(rows: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Normaliza la respuesta de /resenias/calificaciones."""
    out = [{"_id": str(c.get("_id", c.get("numero"))), "numero": int(c["numero"])} for c in rows]
    return {"calificaciones": out}
