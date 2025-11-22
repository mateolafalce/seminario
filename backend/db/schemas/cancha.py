from typing import Any, Dict, List, Optional

def cancha_schema(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None

    horarios = doc.get("horarios") or []

    return {
        "id": str(doc["_id"]),
        "nombre": doc.get("nombre", ""),
        # Siempre lista de strings, aunque en Mongo sean ObjectId
        "horarios": [str(h) for h in horarios],
    }

def canchas_schema(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [cancha_schema(r) for r in rows if r]
