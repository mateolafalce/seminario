# backend/FastAPI/services/authz.py
from typing import List, Set, Dict
from datetime import datetime
from bson import ObjectId
from db.client import db_client

# ========= índices + seed =========
def ensure_rbac_indexes_and_seed():
    from pymongo import ASCENDING
    db_client.roles.create_index([("name", ASCENDING)], unique=True, name="roles_name_1_unique")
    db_client.user_roles.create_index([("user", ASCENDING)], name="user_roles_user_1")
    db_client.user_roles.create_index([("role", ASCENDING)], name="user_roles_role_1")

    _seed_role("admin",     permissions=["*"])
    _seed_role("empleado",  permissions=[
        "reservas.resultado.cargar",
        "reservas.resultado.ver",
        "reservas.dashboard.ver",
    ])
    _seed_role("usuario",   permissions=[])

def _seed_role(name: str, permissions: List[str]):
    db_client.roles.update_one(
        {"name": name},
        {"$setOnInsert": {"name": name, "permissions": permissions}},
        upsert=True
    )

# ========= core =========
def _get_user_role_ids(user_oid: ObjectId) -> List[ObjectId]:
    return [doc["role"] for doc in db_client.user_roles.find({"user": user_oid}, {"role": 1})]

def _get_roles_docs(role_ids: List[ObjectId]) -> List[Dict]:
    if not role_ids:
        return []
    return list(db_client.roles.find({"_id": {"$in": role_ids}}))

def get_user_permissions(user_oid: ObjectId) -> Set[str]:
    roles = _get_roles_docs(_get_user_role_ids(user_oid))
    perms: Set[str] = set()
    for r in roles:
        for p in r.get("permissions", []):
            perms.add(p)
    return perms

def user_has_any_role(user_oid: ObjectId, *names: str) -> bool:
    role_ids = _get_user_role_ids(user_oid)
    if not role_ids:
        return False
    return db_client.roles.count_documents({"_id": {"$in": role_ids}, "name": {"$in": list(names)}}) > 0

def user_has_permission(user_oid: ObjectId, perm: str) -> bool:
    perms = get_user_permissions(user_oid)
    if "*" in perms or perm in perms:
        return True
    # Soporte comodín de primer nivel (ej. "reservas.*")
    maybe = perm.split(".", 1)[0] + ".*"
    return maybe in perms

# ========= asignación =========
def assign_role(user_id: str, role_name: str) -> bool:
    if not ObjectId.is_valid(user_id):
        return False
    user_oid = ObjectId(user_id)
    role = db_client.roles.find_one({"name": role_name})
    if not role:
        raise ValueError(f"Rol no existe: {role_name}")
    db_client.user_roles.update_one(
        {"user": user_oid, "role": role["_id"]},
        {"$setOnInsert": {"user": user_oid, "role": role["_id"], "assigned_at": datetime.utcnow()}},
        upsert=True
    )
    return True

# ========= dependencias FastAPI =========
from fastapi import Depends, HTTPException
from routers.Security.auth import current_user

def require_roles(*role_names: str):
    async def _dep(user=Depends(current_user)):
        uid = (user or {}).get("id")
        if not uid or not ObjectId.is_valid(uid):
            raise HTTPException(status_code=401, detail="No autenticado")
        if not user_has_any_role(ObjectId(uid), *role_names):
            raise HTTPException(status_code=403, detail=f"Requiere rol: {', '.join(role_names)}")
        return user
    return _dep

def require_perms(*perms: str):
    async def _dep(user=Depends(current_user)):
        uid = (user or {}).get("id")
        if not uid or not ObjectId.is_valid(uid):
            raise HTTPException(status_code=401, detail="No autenticado")
        uoid = ObjectId(uid)

        # Admin siempre pasa
        if user_has_any_role(uoid, "admin"):
            return user

        for p in perms:
            if user_has_permission(uoid, p):
                return user

        # --- Compatibilidad con tu diseño actual ---
        # Si no migraste aún, respetá colecciones viejas:
        # 1) admins => equivalen a rol admin
        if db_client.admins.find_one({"user": uoid}):
            return user
        # 2) empleados => equivalente a permiso de empleado en reservas
        if db_client.empleados.find_one({"user": uoid}) and any(
            p.startswith("reservas.") for p in perms
        ):
            return user

        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    return _dep

# ========= util para exponer en /me si querés =========
def get_user_roles_and_perms(user_oid: ObjectId) -> Dict:
    roles = _get_roles_docs(_get_user_role_ids(user_oid))
    return {
        "roles": [r["name"] for r in roles],
        "permissions": sorted(list(get_user_permissions(user_oid))),
    }
