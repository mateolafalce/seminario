from typing import Any, Dict, List, Optional
from bson import ObjectId

def _to_str(x: Any) -> Any:
    if isinstance(x, ObjectId): return str(x)
    if isinstance(x, list):     return [_to_str(i) for i in x]
    if isinstance(x, dict):     return {k: _to_str(v) for k, v in x.items()}
    return x

def public_user_min(u: Optional[Dict[str, Any]], p: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Devuelve un mini perfil público. Toma nombre/apellido desde 'persona' (p).
    """
    if not u: u = {}
    p = p or {}
    return {
        "id": _to_str(u.get("_id")),
        "nombre": p.get("nombre", ""),
        "apellido": p.get("apellido", ""),
        "username": u.get("username", "") or "",
    }

def top_jugador_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Fila agregada de top jugadores, ya proyectada."""
    return {
        "jugador_id": str(row.get("jugador_id") or row.get("_id") or ""),
        "promedio": float(row.get("promedio", 0)),
        "cantidad": int(row.get("cantidad", 0)),
        "nombre": row.get("nombre", ""),
        "apellido": row.get("apellido", ""),
        "username": row.get("username", ""),
    }

def top_jugadores_schema(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [top_jugador_row(_to_str(r)) for r in rows if r]

def public_resenia_row(r: Dict[str, Any]) -> Dict[str, Any]:
    """Row de 'últimas'. Espera autor/destinatario ya proyectados desde 'personas'."""
    r = _to_str(r)
    return {
        "_id": r.get("_id", ""),
        "numero": int(r.get("numero", 0)),
        "observacion": r.get("observacion", "") or "",
        "fecha": r.get("fecha"),
        "autor": r.get("autor", {}),
        "destinatario": r.get("destinatario", {}),
    }

def ultimas_resenias_schema(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [public_resenia_row(r) for r in rows if r]
