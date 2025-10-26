from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from bson import ObjectId
from db.client import db_client
from db.models.categoria import CategoriaCreate, CategoriaUpdate
from routers.Security.auth import require_roles, verify_csrf  # o require_perms si preferís permisos finos

router = APIRouter(prefix="/categorias", tags=["Categorías"],
                   responses={status.HTTP_404_NOT_FOUND: {"message": "No encontrado"}})

@router.get("/listar")
async def listar_categorias():
    cur = db_client.categorias.find({}, {"nombre": 1, "nivel": 1}).sort([("nivel", 1), ("nombre", 1)])
    return [{"id": str(c["_id"]), "nombre": c["nombre"], "nivel": int(c["nivel"])} for c in cur]

@router.post("/crear", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def crear_categoria(payload: CategoriaCreate):
    # nombre o nivel duplicado
    exists = db_client.categorias.find_one({"$or": [{"nombre": payload.nombre}, {"nivel": payload.nivel}]})
    if exists:
        raise HTTPException(400, detail="Ya existe una categoría con ese nombre o nivel")
    res = db_client.categorias.insert_one(payload.dict())
    return {"msg": "Categoría creada", "id": str(res.inserted_id)}

@router.put("/modificar/{categoria_id}", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def modificar_categoria(categoria_id: str, payload: CategoriaUpdate):
    if not ObjectId.is_valid(categoria_id):
        raise HTTPException(400, "ID de categoría inválido")

    updates: Dict[str, Any] = {k: v for k, v in payload.dict(exclude_unset=True).items()}
    if not updates:
        return {"msg": "Sin cambios"}

    if "nombre" in updates and db_client.categorias.find_one(
        {"_id": {"$ne": ObjectId(categoria_id)}, "nombre": updates["nombre"]}
    ):
        raise HTTPException(400, "Ya existe una categoría con ese nombre")

    if "nivel" in updates and db_client.categorias.find_one(
        {"_id": {"$ne": ObjectId(categoria_id)}, "nivel": updates["nivel"]}
    ):
        raise HTTPException(400, "Ya existe una categoría con ese nivel")

    res = db_client.categorias.update_one({"_id": ObjectId(categoria_id)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Categoría no encontrada")

    return {"msg": "Categoría modificada"}

@router.delete("/eliminar/{categoria_id}", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def eliminar_categoria(categoria_id: str):
    if not ObjectId.is_valid(categoria_id):
        raise HTTPException(400, "ID de categoría inválido")

    oid = ObjectId(categoria_id)

    # Limpia referencia en users → categoria: null
    db_client.users.update_many({"categoria": oid}, {"$set": {"categoria": None}})

    res = db_client.categorias.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Categoría no encontrada")

    return {"msg": "Categoría eliminada y referencias limpiadas"}
