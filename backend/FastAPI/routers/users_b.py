from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from typing import Dict, Any
from bson import ObjectId
import asyncio
import pytz
import secrets
from datetime import datetime
from db.client import db_client
from db.models.user import User, UserDB, RegisterUser
from db.models.persona import PersonaUpdate
from db.models.user_admin import (
    AdminBuscarUsuariosRequest,
    AdminModificarUsuarioRequest,
    AdminEliminarUsuarioRequest,
)
from services.user import (
    register_new_user, get_user_by_username, verify_password, update_last_login,
    delete_user_cascade, get_user_and_persona,
    update_persona_by_user_id, list_users_with_personas, search_users_by_persona
)
from db.schemas.user import user_with_persona_schema
from routers.Security.auth import (
    current_user,
    create_access_token,
    set_auth_cookies,
    clear_auth_cookies,
    verify_csrf,
    require_roles,  # RBAC
)
from services.authz import assign_role, get_user_roles_and_perms, user_has_any_role
from services.email import enviar_email_habilitacion
import logging

sec_log = logging.getLogger("security")

router = APIRouter(
    prefix="/users_b",
    tags=["usuarios_b"],
    responses={status.HTTP_400_BAD_REQUEST: {"message": "No encontrado"}}
)

crypt = CryptContext(schemes=["bcrypt"])

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

    r = get_user_roles_and_perms(user_db["_id"])  # {"roles":[...], "permissions":[...]}

    access_token = create_access_token(sub=user_db["username"], extra={"id": str(user_db["_id"])})
    set_auth_cookies(response, access_token)

    return {
        "ok": True,
        "user_id": str(user_db["_id"]),
        "username": user_db["username"],
        "habilitado": bool(user_db.get("habilitado", False)),
        "roles": r["roles"],
        "permissions": r["permissions"],
    }

@router.post("/logout", dependencies=[Depends(verify_csrf)])
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}

@router.get("/me")
async def me(user: Dict[str, Any] = Depends(current_user)):
    """Devuelve el usuario + persona (y opcionalmente roles/permisos, sin flags)."""
    u, p = await asyncio.to_thread(get_user_and_persona, user["id"])
    if not u:
        raise HTTPException(404, "Usuario no encontrado")

    # Si querés incluir roles/permisos en /me:
    rp = get_user_roles_and_perms(ObjectId(user["id"]))  # {"roles": [...], "permissions": [...]}

    result = user_with_persona_schema(u, p)
    result.update({
        "roles": rp["roles"],
        "permissions": rp["permissions"],
    })
    return result

# ---------------------------
# Admin (RBAC) – gestión básica de usuarios
# ---------------------------

@router.get("/admin/users", dependencies=[Depends(require_roles("admin"))])
async def get_all_users(page: int = 1, limit: int = 10):
    rows = await asyncio.to_thread(list_users_with_personas, page, limit)
    return {"users": [
        {
            "id": str(r["_id"]),
            "username": r["username"],
            "roles": r.get("roles", []),
            "habilitado": bool(r.get("habilitado", False)),
            "persona": r["persona"]
        }
        for r in rows
    ]}

@router.post("/buscar", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def buscar_clientes(payload: AdminBuscarUsuariosRequest):
    term = payload.nombre.strip()
    if not term:
        return {"clientes": []}
    rows = await asyncio.to_thread(search_users_by_persona, term, 50)
    return {"clientes": [
        {
            "id": str(r["_id"]),
            "username": r["username"],
            "roles": r.get("roles", []),
            "habilitado": bool(r.get("habilitado", False)),
            "persona": r["persona"]
        } for r in rows
    ]}

@router.post("/modificar", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def modificar_usuario(data: AdminModificarUsuarioRequest):
    try:
        user_id = ObjectId(data.identificador)
    except Exception:
        raise HTTPException(400, "ID inválido")

    def _op():
        u_actual = db_client.users.find_one({"_id": user_id})
        if not u_actual:
            raise ValueError("Usuario a modificar no encontrado")

        # 1) Actualizar persona
        persona_update = {
            "nombre": data.nombre,
            "apellido": data.apellido,
            "email": data.email,
        }
        udoc, pdoc = update_persona_by_user_id(user_id, persona_update)

        # 2) Cambios en users: habilitado / categoria
        set_users = {"habilitado": data.habilitado}

        # Resolver categoría (opcional)
        if data.categoria and data.categoria not in ["Sin categoría", ""]:
            categoria_obj = db_client.categorias.find_one({"nombre": data.categoria})
            if not categoria_obj:
                raise ValueError(f"Categoría '{data.categoria}' no encontrada")
            set_users["categoria"] = categoria_obj["_id"]
        else:
            set_users["categoria"] = None

        # 3) Si cambió el email (ojo: el email vive en PERSONA)
        email_anterior = (db_client.personas.find_one({"_id": u_actual["persona"]}) or {}).get("email")
        email_cambio = (email_anterior or "").lower() != (pdoc.get("email") or "").lower()

        if email_cambio:
            nuevo_token = secrets.token_urlsafe(32)
            set_users["habilitacion_token"] = nuevo_token
            set_users["habilitado"] = False
            enviar_email_habilitacion(pdoc["email"], nuevo_token)

        db_client.users.update_one({"_id": user_id}, {"$set": set_users})
        return email_cambio

    try:
        email_cambio = await asyncio.to_thread(_op)
        msg = "Usuario actualizado correctamente"
        if email_cambio:
            msg += ". Se envió email de verificación al nuevo correo."
        return {"message": msg}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al modificar usuario: {e}")

@router.post("/eliminar", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def eliminar_usuario_body(data: AdminEliminarUsuarioRequest):
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
async def editar_perfil(data: PersonaUpdate, user: Dict[str, Any] = Depends(current_user)):
    try:
        udoc, pdoc = await asyncio.to_thread(
            update_persona_by_user_id, user["id"], data.model_dump(exclude_unset=True)
        )
        return user_with_persona_schema(udoc, pdoc)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al modificar perfil: {e}")

@router.get("/perfil")
async def obtener_perfil(user: Dict[str, Any] = Depends(current_user)):
    u, p = await asyncio.to_thread(get_user_and_persona, user["id"])
    if not u or not p:
        raise HTTPException(404, "Usuario no encontrado")

    categoria_nombre = "Sin categoría"
    if u.get("categoria"):
        cat = db_client.categorias.find_one({"_id": u["categoria"]})
        if cat:
            categoria_nombre = cat.get("nombre", "Sin categoría")

    return {
        "nombre": p.get("nombre"),
        "apellido": p.get("apellido"),
        "username": u.get("username"),
        "email": p.get("email"),
        "habilitado": u.get("habilitado"),
        "fecha_registro": u.get("fecha_registro"),
        "ultima_conexion": u.get("ultima_conexion"),
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

        # 1) Tomar todos los user_ids con los que jugó (distintos del actual)
        reservas_usuario = list(db_client.reservas.find(
            {"usuarios.id": user_id, "estado": est["_id"]},
            {"usuarios": 1}
        ))
        otros_ids = {u.get("id") for r in reservas_usuario for u in r.get("usuarios", []) if u.get("id") and u.get("id") != user_id}
        if not otros_ids:
            return []

        # 2) Join a personas
        pipeline = [
            {"$match": {"_id": {"$in": list(otros_ids)}}},
            {"$lookup": {
                "from": "personas",
                "localField": "persona",
                "foreignField": "_id",
                "as": "persona"
            }},
            {"$unwind": "$persona"},
            {"$project": {
                "_id": 1,
                "username": 1,
                "nombre": "$persona.nombre",
                "apellido": "$persona.apellido",
                "email": "$persona.email"
            }},
        ]
        rows = list(db_client.users.aggregate(pipeline))
        return [{
            "id": str(u["_id"]),
            "username": u.get("username"),
            "nombre": u.get("nombre", ""),
            "apellido": u.get("apellido", ""),
            "email": u.get("email", ""),
        } for u in rows]

    jugadores = await asyncio.to_thread(_op)
    return {"jugadores": jugadores}
