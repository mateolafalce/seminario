import os
import time
import re
from pathlib import Path
from typing import List, Dict, Any

from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
    UploadFile,
    File,
)
from db.client import db_client
from db.schemas.cancha import cancha_schema, canchas_schema
from db.schemas.horario import horarios_schema
from db.models.cancha import CanchaCreate, CanchaUpdate
from routers.Security.auth import verify_csrf, require_perms
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/canchas", tags=["canchas"])

IMAGES_DIR = Path("static/images")


def horarios_y_cancha_son_validos(nombre: str, horarios_ids: List[str]) -> List[ObjectId]:
    """
    Valida que:
    - los horarios existan.
    - no haya otra cancha con el mismo nombre usando exactamente ese set de horarios.
    Devuelve la lista de ObjectId de horarios.
    """
    if not horarios_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debés seleccionar al menos un horario para la cancha",
        )

    # Convertimos a ObjectId
    oids: List[ObjectId] = []
    for hid in horarios_ids:
        try:
            oid = ObjectId(hid)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ID de horario inválido: {hid}",
            )
        oids.append(oid)

    # Verificamos que existan
    count = db_client.horarios.count_documents({"_id": {"$in": oids}})
    if count != len(oids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alguno de los horarios seleccionados no existe",
        )

    return oids


@router.get("/listar")
async def listar_canchas(
    simple: bool = Query(
        False,
        description="True => [{id,nombre}] (ligero). False => cancha completa.",
    ),
    page: int = Query(
        0,
        ge=0,
        description="Página (1 = primera). Si es 0, devuelve la lista completa sin paginar.",
    ),
    limit: int = Query(
        10,
        ge=1,
        le=100,
        description="Cantidad de canchas por página cuando page >= 1.",
    ),
    search: str | None = Query(
        None,
        description="Filtro por nombre de cancha (prefijo, case-insensitive). Solo si lo necesitás.",
    ),
):
    """
    Lista canchas.

    - Si page == 0 -> comportamiento original (devuelve lista completa).
    - Si page >= 1 -> devuelve objeto paginado { canchas, total, page, limit }.
    - search (opcional) filtra por nombre usando prefijo, case-insensitive.
    """
    filtro: Dict[str, Any] = {}

    # Filtro por nombre de cancha (prefijo, insensitive)
    if search:
        term = search.strip()
        if term:
            filtro["nombre"] = {
                "$regex": f"^{re.escape(term)}",
                "$options": "i",
            }

    # 🔹 MODO PAGINADO (para el panel de admin)
    if page >= 1:
        total = db_client.canchas.count_documents(filtro)
        skip = (page - 1) * limit

        cursor = (
            db_client.canchas
            .find(filtro)
            .sort("nombre", 1)
            .skip(skip)
            .limit(limit)
        )
        rows = list(cursor)

        if simple:
            items = [
                {"id": str(c["_id"]), "nombre": c.get("nombre", "")}
                for c in rows
            ]
        else:
            items = canchas_schema(rows)

        return {
            "canchas": items,
            "total": total,
            "page": page,
            "limit": limit,
        }

    # 🔹 MODO ORIGINAL (sin paginación, compat con lo que ya tenías)
    canchas = list(db_client.canchas.find(filtro).sort("nombre", 1))

    if simple:
        # modo liviano
        return [
            {"id": str(c["_id"]), "nombre": c.get("nombre", "")}
            for c in canchas
        ]

    # modo completo (incluye imagenes, horarios, etc.)
    return canchas_schema(canchas)


@router.get("/obtener/{cancha_id}")
async def obtener_cancha(cancha_id: str):
    """
    Devuelve la cancha completa por ID.
    """
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de cancha inválido",
        )

    cancha = db_client.canchas.find_one({"_id": ObjectId(cancha_id)})
    if not cancha:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cancha no encontrada",
        )

    return cancha_schema(cancha)


@router.get("/horarios/{cancha_id}")
async def obtener_horarios_cancha(cancha_id: str):
    """
    Devuelve la lista de horarios (completos) asociados a una cancha, para
    poder mostrar la franja horaria en el frontend.
    """
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de cancha inválido",
        )

    cancha = db_client.canchas.find_one({"_id": ObjectId(cancha_id)})
    if not cancha:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cancha no encontrada",
        )

    horarios_ids = cancha.get("horarios") or []
    if not horarios_ids:
        return []

    rows = list(db_client.horarios.find({"_id": {"$in": horarios_ids}}).sort("hora", 1))
    return horarios_schema(rows)


@router.post(
    "/crear",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.crear"))],
)
async def crear_cancha(cancha: CanchaCreate):
    """
    Crea una cancha nueva con nombre, descripción, imagen, habilitada, horarios e imágenes secundarias.
    """
    try:
        nombre = (cancha.nombre or "").strip()
        if not nombre:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de la cancha es obligatorio",
            )

        # Horarios obligatorios
        if not cancha.horarios:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debés seleccionar al menos un horario para la cancha",
            )

        # Horarios (validación + conversión a ObjectId)
        horarios_oids = horarios_y_cancha_son_validos(nombre, cancha.horarios)

        # Normalizamos descripción / imagen / habilitada
        descripcion = (cancha.descripcion or "").strip() if cancha.descripcion is not None else ""
        imagen_url = (cancha.imagen_url or "").strip() if cancha.imagen_url is not None else ""
        habilitada = True if cancha.habilitada is None else bool(cancha.habilitada)

        # Normalizamos imágenes secundarias
        imagenes_norm: List[str] = []
        if cancha.imagenes is not None:
            for img in cancha.imagenes:
                if isinstance(img, str):
                    s = img.strip()
                    if s:
                        imagenes_norm.append(s)

        # Unicidad por nombre
        ya = db_client.canchas.find_one({"nombre": nombre})
        if ya:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una cancha con ese nombre",
            )

        # Normalizar capacidad
        cap_raw = cancha.capacidad_maxima if cancha.capacidad_maxima is not None else 6
        try:
            capacidad_maxima = int(cap_raw)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="capacidad_maxima inválida")
        if capacidad_maxima < 2:
            raise HTTPException(
                status_code=400,
                detail="La capacidad debe ser de al menos 2 jugadores (1 vs 1).",
            )
        if capacidad_maxima > 50:
            raise HTTPException(status_code=400, detail="capacidad_maxima debe estar entre 1 y 50")

        # Normalizar días de semana (permitimos None = sin restricción)
        dias_semana = None
        if cancha.dias_semana is not None:
            if not isinstance(cancha.dias_semana, list) or not cancha.dias_semana:
                raise HTTPException(status_code=400, detail="dias_semana debe ser una lista no vacía de enteros 0..6")
            dias_norm = []
            for d in cancha.dias_semana:
                try:
                    di = int(d)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=400, detail="dias_semana debe contener enteros entre 0 y 6")
                if di < 0 or di > 6:
                    raise HTTPException(status_code=400, detail="dias_semana debe contener enteros entre 0 y 6")
                dias_norm.append(di)
            dias_semana = sorted(set(dias_norm))

        # Normalizar fechas bloqueadas
        fechas_bloqueadas = []
        if cancha.fechas_bloqueadas:
            from datetime import datetime
            for f in cancha.fechas_bloqueadas:
                if not isinstance(f, str):
                    raise HTTPException(status_code=400, detail="fechas_bloqueadas debe ser lista de strings DD-MM-YYYY")
                s = f.strip()
                if not s:
                    continue
                try:
                    datetime.strptime(s, "%d-%m-%Y")
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Fecha bloqueada inválida: {s}, usar formato DD-MM-YYYY")
                fechas_bloqueadas.append(s)

        doc: Dict[str, Any] = {
            "nombre": nombre,
            "descripcion": descripcion,
            "imagen_url": imagen_url,
            "habilitada": habilitada,
            "horarios": horarios_oids,
            "imagenes": imagenes_norm,
           
            "capacidad_maxima": capacidad_maxima,
            "dias_semana": dias_semana,              # puede ser None => sin restricción
            "fechas_bloqueadas": fechas_bloqueadas,  # lista de strings
        }

        result = db_client.canchas.insert_one(doc)
        nueva = db_client.canchas.find_one({"_id": result.inserted_id})
        return cancha_schema(nueva)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al crear cancha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear la cancha",
        )


@router.put(
    "/modificar/{cancha_id}",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.editar"))],
)
async def modificar_cancha(cancha_id: str, data: CanchaUpdate):
    """
    Modifica una cancha existente.
    - nombre sigue siendo obligatorio a nivel de negocio (por ahora).
    - horarios, si vienen, reemplazan la lista actual.
    - descripción, imagen_url, habilitada, imagenes: se actualizan sólo si vienen en el body.
    """
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de cancha inválido",
        )

    cancha_oid = ObjectId(cancha_id)
    existente = db_client.canchas.find_one({"_id": cancha_oid})
    if not existente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cancha no encontrada",
        )

    # Nombre (seguimos exigiendo uno no vacío)
    nombre = (data.nombre if data.nombre is not None else existente.get("nombre", "")).strip()
    if not nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de la cancha es obligatorio",
        )

    # Unicidad por nombre (excluyendo la propia)
    ya = db_client.canchas.find_one({"nombre": nombre, "_id": {"$ne": cancha_oid}})
    if ya:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe otra cancha con ese nombre",
        )

    update_fields: Dict[str, Any] = {"nombre": nombre}

    # Descripción
    if data.descripcion is not None:
        update_fields["descripcion"] = (data.descripcion or "").strip()

    # Imagen principal
    if data.imagen_url is not None:
        update_fields["imagen_url"] = (data.imagen_url or "").strip()

    # Habilitada
    if data.habilitada is not None:
        update_fields["habilitada"] = bool(data.habilitada)

    # Horarios (si vienen, reemplazan)
    if data.horarios is not None:
        horarios_oids = horarios_y_cancha_son_validos(nombre, data.horarios)
        update_fields["horarios"] = horarios_oids

    # Imágenes secundarias (si vienen, reemplazan completamente la lista)
    if data.imagenes is not None:
        imagenes_norm: List[str] = []
        for img in (data.imagenes or []):
            if isinstance(img, str):
                s = img.strip()
                if s:
                    imagenes_norm.append(s)
        update_fields["imagenes"] = imagenes_norm

    # capacidad
    if data.capacidad_maxima is not None:
        try:
            cap = int(data.capacidad_maxima)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="capacidad_maxima inválida")
        if cap < 2:
            raise HTTPException(
                status_code=400,
                detail="La capacidad debe ser de al menos 2 jugadores (1 vs 1).",
            )
        if cap > 50:
            raise HTTPException(status_code=400, detail="capacidad_maxima debe estar entre 1 y 50")
        update_fields["capacidad_maxima"] = cap

    # días semana
    if data.dias_semana is not None:
        if not data.dias_semana:
            raise HTTPException(
                status_code=400,
                detail="Debes habilitar al menos un día de la semana para que la cancha funcione.",
            )
        if not isinstance(data.dias_semana, list):
            raise HTTPException(status_code=400, detail="dias_semana debe ser una lista no vacía de enteros 0..6")
        dias_norm = []
        for d in data.dias_semana:
            try:
                di = int(d)
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="dias_semana debe contener enteros entre 0 y 6")
            if di < 0 or di > 6:
                raise HTTPException(status_code=400, detail="dias_semana debe contener enteros entre 0 y 6")
            dias_norm.append(di)
        update_fields["dias_semana"] = sorted(set(dias_norm))

    # fechas bloqueadas
    if data.fechas_bloqueadas is not None:
        from datetime import datetime
        fechas_ok = []
        for f in data.fechas_bloqueadas:
            if not isinstance(f, str):
                raise HTTPException(status_code=400, detail="fechas_bloqueadas debe ser lista de strings DD-MM-YYYY")
            s = f.strip()
            if not s:
                continue
            try:
                datetime.strptime(s, "%d-%m-%Y")
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Fecha bloqueada inválida: {s}, usar formato DD-MM-YYYY")
            fechas_ok.append(s)
        update_fields["fechas_bloqueadas"] = fechas_ok

    try:
        db_client.canchas.update_one({"_id": cancha_oid}, {"$set": update_fields})
        actualizada = db_client.canchas.find_one({"_id": cancha_oid})
        return cancha_schema(actualizada)
    except Exception as e:
        print(f"Error al modificar cancha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al modificar la cancha",
        )


@router.delete(
    "/eliminar/{cancha_id}",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.eliminar"))],
)
async def eliminar_cancha(cancha_id: str):
    """
    Elimina una cancha.
    (Más adelante, si querés, podemos pasar a un flag 'eliminada' en vez de borrar).
    """
    if not ObjectId.is_valid(cancha_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de cancha inválido",
        )

    cancha_oid = ObjectId(cancha_id)
    existente = db_client.canchas.find_one({"_id": cancha_oid})
    if not existente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cancha no encontrada",
        )

    try:
        db_client.canchas.delete_one({"_id": cancha_oid})
        return {"msg": "Cancha eliminada correctamente"}
    except Exception as e:
        print(f"Error al eliminar cancha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar la cancha",
        )


@router.post(
    "/subir-imagen",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.editar"))],
)
async def subir_imagen_cancha(archivo: UploadFile = File(...)):
    """
    Sube una imagen de cancha al filesystem (static/images) y devuelve la URL relativa,
    por ejemplo: { "url": "/images/cancha_123456789.jpg" }
    """
    if not archivo:
        raise HTTPException(status_code=400, detail="No se recibió ningún archivo")

    if not archivo.content_type or not archivo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # extensión segura
    original_name = archivo.filename or ""
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"

    filename = f"cancha_{int(time.time() * 1000)}{ext}"
    path = IMAGES_DIR / filename

    try:
        contenido = await archivo.read()
        with path.open("wb") as f:
            f.write(contenido)
    except Exception as e:
        print(f"[canchas.subir-imagen] Error guardando imagen: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar la imagen")

    # OJO: main.py ya hace app.mount("/images", StaticFiles(directory="static/images"), ...)
    return {"url": f"/images/{filename}"}
