from fastapi import APIRouter, Depends, HTTPException, Query, status, Body, Response
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from typing import Optional

from db.client import db_client
from routers.Security.auth import current_user, verify_csrf
from routers.defs import user_schema  

router_admin = APIRouter(
    prefix="/admin",
    tags=["admin"],
)

async def require_admin(user=Depends(current_user)):
    uid = user.get("id")
    if not uid or not ObjectId.is_valid(uid):
        raise HTTPException(status_code=401, detail="No autenticado")

    oid = ObjectId(uid)

    # Solo acepta si hay un doc en admins con campo "user" == user_id
    if db_client.admins.find_one({"user": oid}):
        return user

    # O flag opcional en users
    udoc = db_client.users.find_one({"_id": oid}, {"is_admin": 1})
    if udoc and udoc.get("is_admin"):
        return user

    raise HTTPException(status_code=403, detail="Requiere administrador")


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
    _: dict = Depends(require_admin),
):
    skip = (page - 1) * limit
    total = db_client.users.count_documents({})
    # traé todo menos credenciales
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
            # ⬇️ Estos dos campos ahora salen del backend
            "fecha_registro": u.get("fecha_registro") or None,
            "ultima_conexion": u.get("ultima_conexion") or None,
        }
        # normalizar categoría -> nombre legible
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
    _: dict = Depends(require_admin),
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
def get_user(
    id: str,
    _: dict = Depends(require_admin),
):
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
    _: dict = Depends(require_admin),
    __=Depends(verify_csrf),
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
    admin=Depends(require_admin),
    __=Depends(verify_csrf),
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")

    # No permitir borrarse a sí mismo
    if admin.get("id") == id:
        raise HTTPException(status_code=403, detail="No puedes eliminarte a ti mismo")

    res = db_client.users.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No encontrado")
    return Response(status_code=204)
