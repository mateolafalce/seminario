from typing import Any, Dict, List, Optional

def horario_schema(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    return {"id": str(doc["_id"]), "hora": doc.get("hora", "")}

def horarios_schema(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [horario_schema(r) for r in rows if r]
