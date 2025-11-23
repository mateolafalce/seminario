from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
from bson import ObjectId

from db.client import db_client
from db.schemas.cancha import canchas_schema, cancha_schema
from db.models.cancha import CanchaCreate, CanchaUpdate
from routers.Security.auth import verify_csrf, require_perms

router = APIRouter(
    prefix="/canchas",
    tags=["canchas"],
    responses={404: {"message": "No encontrado"}},
)


def horarios_y_cancha_son_validos(nombre: str, horarios: Optional[List[str]]) -> List[ObjectId]:
    """
    Valida nombre y horarios:
      - nombre no vacío
      - horarios, si vienen, deben ser ObjectId válidos y existir en la colección horarios
    Devuelve la lista de ObjectId de horarios.
    """
    nombre = (nombre or "").strip()
    if not nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de la cancha es obligatorio",
        )

    horarios = horarios or []
    horarios_oids: List[ObjectId] = []

    if horarios:
        # Validar IDs
        for h_id in horarios:
            if not ObjectId.is_valid(h_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"ID de horario inválido: {h_id}",
                )
            horarios_oids.append(ObjectId(h_id))

        # Validar existencia en la colección horarios
        existentes = list(
            db_client.horarios.find(
                {"_id": {"$in": horarios_oids}},
                {"_id": 1},
            )
        )
        if len(existentes) != len(horarios_oids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Alguno de los horarios seleccionados no existe",
            )

    return horarios_oids


@router.get("/listar", dependencies=[Depends(verify_csrf)])
async def listar_canchas(
    solo_habilitadas: bool = Query(False, description="Si es true, sólo devuelve canchas habilitadas"),
):
    """
    Lista todas las canchas ordenadas por nombre.
    Opcionalmente sólo las habilitadas.
    """
    try:
        filtro = {}
        if solo_habilitadas:
            filtro["habilitada"] = True

        cursor = db_client.canchas.find(filtro).sort("nombre", 1)
        canchas = list(cursor)
        return canchas_schema(canchas)
    except Exception as e:
        print(f"Error al listar canchas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al listar canchas",
        )


@router.post(
    "/crear",
    dependencies=[Depends(verify_csrf), Depends(require_perms("canchas.crear"))],
)
async def crear_cancha(cancha: CanchaCreate):
    """
    Crea una cancha nueva con nombre, descripción, imagen, habilitada y horarios.
    """
    try:
        nombre = (cancha.nombre or "").strip()
        if not nombre:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de la cancha es obligatorio",
            )

        # Horarios
        horarios_oids = horarios_y_cancha_son_validos(nombre, cancha.horarios)

        # Normalizamos descripción / imagen / habilitada
        descripcion = (cancha.descripcion or "").strip() if cancha.descripcion is not None else ""
        imagen_url = (cancha.imagen_url or "").strip() if cancha.imagen_url is not None else ""
        habilitada = True if cancha.habilitada is None else bool(cancha.habilitada)

        # Unicidad por nombre
        ya = db_client.canchas.find_one({"nombre": nombre})
        if ya:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una cancha con ese nombre",
            )

        doc = {
            "nombre": nombre,
            "descripcion": descripcion,
            "imagen_url": imagen_url,
            "habilitada": habilitada,
            "horarios": horarios_oids,
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
    - descripción, imagen_url, habilitada: se actualizan sólo si vienen en el body.
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

    update_fields = {"nombre": nombre}

    # Descripción
    if data.descripcion is not None:
        update_fields["descripcion"] = (data.descripcion or "").strip()

    # Imagen
    if data.imagen_url is not None:
        update_fields["imagen_url"] = (data.imagen_url or "").strip()

    # Habilitada
    if data.habilitada is not None:
        update_fields["habilitada"] = bool(data.habilitada)

    # Horarios (si vienen, reemplazan)
    if data.horarios is not None:
        horarios_oids = horarios_y_cancha_son_validos(nombre, data.horarios)
        update_fields["horarios"] = horarios_oids

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
