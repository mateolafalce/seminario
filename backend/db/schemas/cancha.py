from typing import Any, Dict, List, Optional

def cancha_schema(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "nombre": doc.get("nombre", "")
    }

def canchas_schema(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [cancha_schema(r) for r in rows if r]
