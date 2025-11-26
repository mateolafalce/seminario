from typing import Any, Dict, List

def cancha_schema(cancha: Dict[str, Any]) -> Dict[str, Any]:
    imagenes = cancha.get("imagenes") or []

    # Capacidad con fallback seguro
    cap_raw = cancha.get("capacidad_maxima", 6)
    try:
        capacidad_maxima = int(cap_raw)
    except (TypeError, ValueError):
        capacidad_maxima = 6
    capacidad_maxima = max(1, min(capacidad_maxima, 50))

    # Días de semana:
    # - si viene lista no vacía: filtramos/normalizamos ints 0..6
    # - si no viene nada: asumimos TODOS los días (0..6) para el front
    dias_raw = cancha.get("dias_semana")
    dias_semana: List[int] = []
    if isinstance(dias_raw, list) and dias_raw:
        for d in dias_raw:
            try:
                di = int(d)
            except (TypeError, ValueError):
                continue
            if 0 <= di <= 6:
                dias_semana.append(di)
        dias_semana = sorted(set(dias_semana))
    else:
        dias_semana = list(range(7))  # compatibilidad: antes era “todos los días”

    # Fechas bloqueadas limpias
    fechas_raw = cancha.get("fechas_bloqueadas") or []
    fechas_bloqueadas: List[str] = []
    for f in fechas_raw:
        if isinstance(f, str):
            s = f.strip()
            if s:
                fechas_bloqueadas.append(s)

    return {
        "id": str(cancha["_id"]),
        "nombre": cancha["nombre"],
        "descripcion": cancha.get("descripcion"),
        "imagen_url": cancha.get("imagen_url"),
        "imagenes": [
            img for img in imagenes if isinstance(img, str) and img.strip()
        ],
        "habilitada": cancha.get("habilitada", True),
        "horarios": [str(h) for h in cancha.get("horarios", [])],
        # 🔴 NUEVOS CAMPOS
        "capacidad_maxima": capacidad_maxima,
        "dias_semana": dias_semana,
        "fechas_bloqueadas": fechas_bloqueadas,
    }


def canchas_schema(canchas) -> list[dict]:
    return [cancha_schema(c) for c in canchas]
