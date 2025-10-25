# backend/FastAPI/routers/users_b.py
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from typing import Dict, Any, List, Optional
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
import asyncio
import pytz
import secrets
from datetime import datetime

from db.client import db_client
from db.models.user import User, UserDB, RegisterUser
from services.user import register_new_user, get_user_by_username, verify_password, update_last_login, delete_user_cascade, get_user_and_persona
from db.schemas.user import user_with_persona_schema
from routers.defs import search_user_db
from routers.Security.auth import (
    current_user,
    create_access_token,
    set_auth_cookies,
    clear_auth_cookies,
    verify_csrf,
    require_roles,  # ✅ RBAC
)
from services.authz import assign_role, get_user_roles_and_perms, user_has_any_role
from services.email import enviar_email_habilitacion
from services.persona import create_persona_for_user
from utils.security import (
    generate_salt,
    hash_password_with_salt,
    verify_password_with_salt,
    is_bcrypt_hash,
)

router = APIRouter(
    prefix="/users_b",
    tags=["usuarios_b"],
    responses={status.HTTP_400_BAD_REQUEST: {"message": "No encontrado"}}
)

crypt = CryptContext(schemes=["bcrypt"])

# ---------------------------
# Helpers
# ---------------------------

def _roles_info(user_oid: ObjectId):
    """Devuelve (roles/perms, is_admin, is_empleado) derivados de RBAC."""
    r = get_user_roles_and_perms(user_oid)  # {"roles":[...], "permissions":[...]}
    is_admin = "admin" in r["roles"]
    is_empleado = ("empleado" in r["roles"]) or any(p.startswith("reservas.") for p in r["permissions"])
    return r, is_admin, is_empleado

def _ar_tstamp():
    tz = pytz.timezone("America/Argentina/Buenos_Aires")
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

# ---------------------------
# Schemas request
# ---------------------------

class BuscarClienteRequest(BaseModel):
    nombre: str

class ModificarUsuarioRequest(BaseModel):
    identificador: str
    nombre: str
    apellido: str
    email: EmailStr
    habilitado: bool
    categoria: Optional[str] = None  # "Sin categoría" | "" | nombre

class EliminarUsuarioRequest(BaseModel):
    identificador: str

class EditarPerfilRequest(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr

# ---------------------------
# Registro / Login / Logout / Me
# ---------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterUser):
    try:
        await asyncio.to_thread(register_new_user, payload)
        return {"ok": True, "message": "Usuario registrado. Revisa tu email para habilitar la cuenta."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(response: Response, form: OAuth2PasswordRequestForm = Depends()):
    user_db = await asyncio.to_thread(get_user_by_username, form.username)
    if not user_db or not verify_password(user_db, form.password):
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")
    
    await asyncio.to_thread(update_last_login, user_db["_id"])

    # derivar roles/flags
    r, is_admin, is_empleado = _roles_info(user_db["_id"])

    # cookies httpOnly + CSRF
    access_token = create_access_token(sub=user_db["username"], extra={"id": str(user_db["_id"])})
    set_auth_cookies(response, access_token)

    return {
        "ok": True,
        "user_id": str(user_db["_id"]),
        "username": user_db["username"],
        "habilitado": bool(user_db.get("habilitado", False)),
        "roles": r["roles"],
        "permissions": r["permissions"],
        "is_admin": is_admin,        # compat para tu front actual
        "is_empleado": is_empleado,  # compat
    }

@router.post("/logout", dependencies=[Depends(verify_csrf)])
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}

@router.get("/me")
async def me(user: Dict[str, Any] = Depends(current_user)):
    """Devuelve el usuario + roles/permissions (RBAC) + persona."""
    u, p = await asyncio.to_thread(get_user_and_persona, user["id"])
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    
    # Obtener roles y permisos
    r, is_admin, is_empleado = _roles_info(ObjectId(user["id"]))
    
    # Usar el schema helper para formatear la respuesta
    result = user_with_persona_schema(u, p)
    
    # Agregar roles y permisos al resultado
    result.update({
        "roles": r["roles"],
        "permissions": r["permissions"],
        "is_admin": is_admin,
        "is_empleado": is_empleado,
    })
    
    return result

# ---------------------------
# Admin (RBAC) – gestión básica de usuarios
# ---------------------------

@router.get("/admin/users", dependencies=[Depends(require_roles("admin"))])
async def get_all_users(page: int = 1, limit: int = 10):
    skip = (page - 1) * limit
    total_users = await asyncio.to_thread(lambda: db_client.users.count_documents({}))
    cursor = await asyncio.to_thread(lambda: db_client.users.find({}, {"password": 0, "salt": 0}).skip(skip).limit(limit))

    users_list: List[Dict[str, Any]] = []
    for u in cursor:
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
        users_list.append(out)

    return {"total": total_users, "page": page, "limit": limit, "users": users_list}

@router.post("/buscar", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def buscar_clientes(payload: BuscarClienteRequest):
    nombre = (payload.nombre or "").strip()
    if not nombre:
        return {"clientes": []}

    def _buscar():
        return list(db_client.users.find(
            {"username": {"$regex": f"^{nombre}", "$options": "i"}},
            {"password": 0, "salt": 0}
        ))

    clientes = await asyncio.to_thread(_buscar)
    out = []
    for c in clientes:
        categoria_nombre = None
        if c.get("categoria"):
            cat = db_client.categorias.find_one({"_id": c["categoria"]})
            if cat:
                categoria_nombre = cat.get("nombre")
        out.append({
            "_id": str(c["_id"]),
            "nombre": c.get("nombre"),
            "apellido": c.get("apellido"),
            "username": c.get("username"),
            "email": c.get("email"),
            "habilitado": c.get("habilitado"),
            "fecha_registro": c.get("fecha_registro"),
            "ultima_conexion": c.get("ultima_conexion"),
            "categoria": categoria_nombre if categoria_nombre else None,
        })
    return {"clientes": out}

@router.post("/modificar", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def modificar_usuario(data: ModificarUsuarioRequest):
    try:
        user_id = ObjectId(data.identificador)
    except Exception:
        raise HTTPException(400, "ID inválido")

    def _op():
        usuario_actual = db_client.users.find_one({"_id": user_id})
        if not usuario_actual:
            raise ValueError("Usuario a modificar no encontrado")

        categoria_obj = None
        if data.categoria and data.categoria not in ["Sin categoría", ""]:
            categoria_obj = db_client.categorias.find_one({"nombre": data.categoria})
            if not categoria_obj:
                raise ValueError(f"Categoría '{data.categoria}' no encontrada")

        update_data = {
            "nombre": data.nombre,
            "apellido": data.apellido,
            "email": data.email,
            "habilitado": data.habilitado,
        }

        email_cambio = usuario_actual.get("email") != data.email
        if email_cambio:
            nuevo_token = secrets.token_urlsafe(32)
            update_data["habilitacion_token"] = nuevo_token
            update_data["habilitado"] = False
            enviar_email_habilitacion(data.email, nuevo_token)

        if categoria_obj:
            update_data["categoria"] = categoria_obj["_id"]
        elif data.categoria in ["Sin categoría", ""]:
            update_data["categoria"] = None

        res = db_client.users.update_one({"_id": user_id}, {"$set": update_data})
        if res.matched_count == 0:
            raise ValueError("Usuario a modificar no encontrado")
        return email_cambio

    try:
        email_cambio = await asyncio.to_thread(_op)
        msg = "Usuario actualizado correctamente"
        if email_cambio:
            msg += ". Se ha enviado un email de verificación al nuevo correo."
        return {"message": msg}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al modificar usuario: {e}")

@router.post("/eliminar", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def eliminar_usuario_body(data: EliminarUsuarioRequest):
    try:
        user_oid = ObjectId(data.identificador)
    except Exception:
        raise HTTPException(400, "ID inválido")
    
    try:
        await asyncio.to_thread(delete_user_cascade, user_oid)
        return {"message": "Usuario y todos sus datos asociados eliminados correctamente"}
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al eliminar usuario: {e}")

@router.delete("/{user_id}", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def eliminar_usuario_path(user_id: str):
    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "ID inválido")
    
    try:
        await asyncio.to_thread(delete_user_cascade, user_oid)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al eliminar usuario: {e}")

# ---------------------------
# Perfil (usuario autenticado)
# ---------------------------

@router.put("/me/", dependencies=[Depends(verify_csrf)])
async def editar_perfil(request: Request, user: Dict[str, Any] = Depends(current_user)):
    body = await request.json()
    try:
        data = EditarPerfilRequest(**body)
    except Exception as e:
        raise HTTPException(400, str(e))

    def _op():
        usuario_actual = db_client.users.find_one({"_id": ObjectId(user["id"])})
        if not usuario_actual:
            raise ValueError("Usuario no encontrado")

        update_data = {"nombre": data.nombre, "apellido": data.apellido, "email": data.email}
        email_cambio = usuario_actual.get("email") != data.email
        if email_cambio:
            nuevo_token = secrets.token_urlsafe(32)
            update_data["habilitacion_token"] = nuevo_token
            update_data["habilitado"] = False
            enviar_email_habilitacion(data.email, nuevo_token)

        res = db_client.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update_data})
        if res.matched_count == 0:
            raise ValueError("Usuario no encontrado")
        return email_cambio

    try:
        email_cambio = await asyncio.to_thread(_op)
        msg = "Perfil actualizado correctamente"
        if email_cambio:
            msg += ". Se ha enviado un email de verificación al nuevo correo."
        return {"message": msg}
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al modificar perfil: {e}")

@router.get("/perfil")
async def obtener_perfil(user: Dict[str, Any] = Depends(current_user)):
    usuario = await asyncio.to_thread(lambda: db_client.users.find_one({"_id": ObjectId(user["id"])}))
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")

    categoria_nombre = "Sin categoría"
    if usuario.get("categoria"):
        cat = db_client.categorias.find_one({"_id": usuario["categoria"]})
        if cat:
            categoria_nombre = cat.get("nombre", "Sin categoría")

    return {
        "nombre": usuario.get("nombre"),
        "apellido": usuario.get("apellido"),
        "username": usuario.get("username"),
        "email": usuario.get("email"),
        "habilitado": usuario.get("habilitado"),
        "fecha_registro": usuario.get("fecha_registro"),
        "ultima_conexion": usuario.get("ultima_conexion"),
        "categoria": categoria_nombre,
    }

# ---------------------------
# Utilidades varias del usuario
# ---------------------------

@router.get("/habilitar")
async def habilitar_usuario(token: str = Query(...)):
    user = await asyncio.to_thread(lambda: db_client.users.find_one({"habilitacion_token": token}))
    if not user:
        raise HTTPException(404, "Token inválido")

    await asyncio.to_thread(lambda: db_client.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"habilitado": True, "habilitacion_token": None}}
    ))
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="https://boulevard81.sixtor.site/habilitado")

@router.get("/jugadores_con_quienes_jugo")
async def jugadores_con_quienes_jugo(user: Dict[str, Any] = Depends(current_user)):
    user_id = ObjectId(user["id"])

    def _op():
        est = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
        if not est:
            return []
        reservas_usuario = list(db_client.reservas.find({"usuarios.id": user_id, "estado": est["_id"]}, {"usuarios": 1}))
        otros_ids = set()
        for r in reservas_usuario:
            for u in r.get("usuarios", []):
                uid = u.get("id")
                if uid and uid != user_id:
                    otros_ids.add(uid)
        usuarios = list(db_client.users.find({"_id": {"$in": list(otros_ids)}}))
        return [{
            "id": str(u["_id"]),
            "nombre": u.get("nombre"),
            "apellido": u.get("apellido"),
            "username": u.get("username"),
            "email": u.get("email"),
        } for u in usuarios]

    jugadores = await asyncio.to_thread(_op)
    return {"jugadores": jugadores}
