from typing import Any, Dict, Iterable, List


def cancha_schema(cancha: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el documento de cancha que viene de Mongo a un dict
    listo para enviar al frontend.
    """
    imagenes = cancha.get("imagenes") or []

    return {
        "id": str(cancha.get("_id")),
        "nombre": cancha.get("nombre", ""),
        "descripcion": cancha.get("descripcion", "") or "",
        "imagen_url": cancha.get("imagen_url") or "",
        # NUEVO: lista de urls de imágenes secundarias
        "imagenes": [img for img in imagenes if isinstance(img, str) and img.strip()],
        "habilitada": bool(cancha.get("habilitada", True)),
        # guardamos solo los ids de horarios como strings
        "horarios": [str(h) for h in (cancha.get("horarios") or [])],
    }


def canchas_schema(canchas: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [cancha_schema(c) for c in canchas]
