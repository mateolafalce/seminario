from fastapi import APIRouter, Depends, HTTPException, Query, Body, Response
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from typing import Optional, Dict, Any

from db.client import db_client
from routers.Security.auth import require_roles, verify_csrf
from db.schemas.user import user_schema  # <- directo del schema

router_admin = APIRouter(prefix="/admin", tags=["admin"])

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    habilitado: Optional[bool] = None
    categoria: Optional[str] = None

@router_admin.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    _: Dict[str, Any] = Depends(require_roles("admin")),
):
    skip = (page - 1) * limit
    total = db_client.users.count_documents({})
    cur = db_client.users.find({}, {"password": 0, "salt": 0}).skip(skip).limit(limit)

    users = []
    for u in cur:
        out = {
            "id": str(u["_id"]),
            "nombre": u.get("nombre", ""),
            "apellido": u.get("apellido", ""),
            "username": u.get("username", ""),
            "email": u.get("email", ""),
            "habilitado": bool(u.get("habilitado", False)),
            "fecha_registro": u.get("fecha_registro") or None,
            "ultima_conexion": u.get("ultima_conexion") or None,
        }
        cat = u.get("categoria")
        if isinstance(cat, ObjectId):
            cat_doc = db_client.categorias.find_one({"_id": cat}, {"nombre": 1})
            out["categoria"] = cat_doc["nombre"] if cat_doc else "Sin categoría"
        else:
            out["categoria"] = cat if (isinstance(cat, str) and cat.strip()) else "Sin categoría"
        users.append(out)

    return {"users": users, "total": total, "page": page, "limit": limit}

@router_admin.post("/users/buscar")
def search_users(
    payload: dict = Body(...),
    _: Dict[str, Any] = Depends(require_roles("admin")),
):
    nombre = (payload.get("nombre") or "").strip()
    if not nombre:
        return {"users": []}

    regex = {"$regex": nombre, "$options": "i"}
    q = {"$or": [
        {"nombre": regex},
        {"apellido": regex},
        {"username": regex},
        {"email": regex},
    ]}
    cur = db_client.users.find(q, {"password": 0, "salt": 0}).limit(50)

    users = []
    for u in cur:
        out = {
            "id": str(u["_id"]),
            "nombre": u.get("nombre", ""),
            "apellido": u.get("apellido", ""),
            "username": u.get("username", ""),
            "email": u.get("email", ""),
            "habilitado": bool(u.get("habilitado", False)),
            "fecha_registro": u.get("fecha_registro") or None,
            "ultima_conexion": u.get("ultima_conexion") or None,
        }
        cat = u.get("categoria")
        if isinstance(cat, ObjectId):
            cat_doc = db_client.categorias.find_one({"_id": cat}, {"nombre": 1})
            out["categoria"] = cat_doc["nombre"] if cat_doc else "Sin categoría"
        else:
            out["categoria"] = cat if (isinstance(cat, str) and cat.strip()) else "Sin categoría"
        users.append(out)

    return {"users": users}

@router_admin.get("/users/{id}")
def get_user(id: str, _: Dict[str, Any] = Depends(require_roles("admin"))):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")
    u = db_client.users.find_one({"_id": ObjectId(id)})
    if not u:
        raise HTTPException(status_code=404, detail="No encontrado")
    return user_schema(u)

@router_admin.put("/users/{id}")
def update_user(
    id: str,
    payload: UserUpdate,
    _: Dict[str, Any] = Depends(require_roles("admin")),
    __ = Depends(verify_csrf),
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")
    updates = {k: v for k, v in payload.dict(exclude_unset=True).items()}
    if not updates:
        return {"msg": "Sin cambios"}

    res = db_client.users.update_one({"_id": ObjectId(id)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="No encontrado")

    u = db_client.users.find_one({"_id": ObjectId(id)})
    return user_schema(u)

@router_admin.delete("/users/{id}", status_code=204)
def delete_user(
    id: str,
    _: Dict[str, Any] = Depends(require_roles("admin")),
    __ = Depends(verify_csrf),
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")

    # Eliminar asignaciones de rol del usuario
    db_client.user_roles.delete_many({"user": ObjectId(id)})

    res = db_client.users.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No encontrado")
    return Response(status_code=204)
