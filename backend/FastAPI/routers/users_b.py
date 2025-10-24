from fastapi import APIRouter, Depends, HTTPException, status, Body, Query, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from routers.Security.auth import current_user, create_access_token, set_auth_cookies, clear_auth_cookies, verify_csrf
from passlib.context import CryptContext
from datetime import datetime, timedelta
from routers.defs import *
from db.models.user import User, UserDB
from db.client import db_client
from pydantic import BaseModel, EmailStr
from bson import ObjectId
import asyncio
from datetime import datetime
import pytz
import secrets
from services.email import enviar_email_habilitacion
from fastapi.responses import RedirectResponse
from utils.security import generate_salt, hash_password_with_salt, verify_password_with_salt, is_bcrypt_hash

router = APIRouter(
    prefix="/users_b",
    tags=["usuarios_b"],
    responses={status.HTTP_400_BAD_REQUEST: {"message": "No encontrado"}}
)
crypt = CryptContext(schemes=["bcrypt"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserDB):
    existing_user = search_user_db("username", user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya existe"
        )

    user_dict = dict(user)
    del user_dict["id"]

    # Generar salt y hashear contraseña
    salt = generate_salt()
    hashed_password = hash_password_with_salt(user.password, salt)
    
    user_dict["password"] = hashed_password
    user_dict["salt"] = salt  # Guardar el salt en la base de datos

    user_dict["habilitado"] = False
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    fecha_argentina = datetime.now(argentina_tz).strftime("%Y-%m-%d %H:%M:%S")
    user_dict["fecha_registro"] = fecha_argentina
    user_dict["ultima_conexion"] = None
    user_dict["categoria"] = None

    # Generar token de habilitación
    habilitacion_token = secrets.token_urlsafe(32)
    user_dict["habilitacion_token"] = habilitacion_token
    # enviar mail
    enviar_email_habilitacion(user.email, habilitacion_token)
    id = db_client.users.insert_one(user_dict).inserted_id

    # No se devuelve access_token, solo mensaje
    return {"ok": True, "message": "Usuario registrado. Revisa tu email para habilitar la cuenta."}


def check_admin(user_id: str):
    try:
        admin = db_client.admins.find_one({"user": ObjectId(user_id)})
        return admin is not None
    except Exception as e:
        print(f"Error al verificar el administrador: {e}")
        return False


def check_empleado(user_id: str):
    try:
        print(f"Verificando empleado para user_id: {user_id}")  # LOG
        empleado = db_client.empleados.find_one({"user": ObjectId(user_id)})
        print(f"Resultado de búsqueda en empleados: {empleado}")  # LOG
        return empleado is not None
    except Exception as e:
        print(f"Error al verificar el empleado: {e}")
        return False


# --- LOGIN: setea cookies HttpOnly + CSRF ---
@router.post("/login")
async def login(response: Response, form: OAuth2PasswordRequestForm = Depends()):
    user_db_data = await asyncio.to_thread(lambda: db_client.users.find_one({"username": form.username}))
    if user_db_data is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario o contraseña incorrectos")

    # verifica password (tu lógica existente)
    password_valid = False
    if user_db_data.get("salt"):
        password_valid = verify_password_with_salt(form.password, user_db_data["salt"], user_db_data["password"])
    elif is_bcrypt_hash(user_db_data["password"]):
        password_valid = crypt.verify(form.password, user_db_data["password"])
        if password_valid:
            # migración a salt (tu lógica)…
            pass

    if not password_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario o contraseña incorrectos")

    # actualizar ultima_conexion (igual que antes)
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    fecha_argentina = datetime.now(argentina_tz).strftime("%Y-%m-%d %H:%M:%S")
    await asyncio.to_thread(lambda: db_client.users.update_one({"_id": user_db_data["_id"]}, {"$set": {"ultima_conexion": fecha_argentina}}))

    # flags adicionales
    is_admin = await asyncio.to_thread(lambda: check_admin(user_db_data["_id"]))
    is_empleado = await asyncio.to_thread(lambda: check_empleado(user_db_data["_id"]))

    # crea token y setea cookies
    access_token = create_access_token(
        sub=user_db_data["username"],
        extra={"id": str(user_db_data["_id"])}
    )
    set_auth_cookies(response, access_token)

    # devolvé solo lo necesario para UI (NO el token)
    return {
        "ok": True,
        "user_id": str(user_db_data["_id"]),
        "username": user_db_data["username"],
        "is_admin": is_admin,
        "is_empleado": is_empleado,
        "habilitado": user_db_data.get("habilitado", False)
    }

# --- LOGOUT: borra cookies ---
@router.post("/logout", dependencies=[Depends(verify_csrf)])
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: User = Depends(current_user)):
    return user


@router.get("/admin/users")
async def get_all_users(
        user: dict = Depends(current_user),
        page: int = 1,
        limit: int = 10):
    # Verificar si el usuario es admin
    is_admin = await asyncio.to_thread(
        lambda: db_client.admins.find_one({"user": ObjectId(user['id'])})
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a esta información"
        )

    # Lógica de paginación
    skip = (page - 1) * limit

    # Obtener el total de usuarios y los usuarios de la página actual
    total_users = await asyncio.to_thread(lambda: db_client.users.count_documents({}))
    users_cursor = await asyncio.to_thread(
        lambda: db_client.users.find({}, {"password": 0}).skip(skip).limit(limit)
    )

    users_list = []
    for u in users_cursor:
        u["id"] = str(u["_id"])
        del u["_id"]

        # Manejar el campo 'categoria' para que sea serializable
        if "categoria" in u and u["categoria"] is not None and isinstance(
                u["categoria"], ObjectId):
            # Buscar el nombre de la categoría correspondiente al ObjectId
            categoria_obj = db_client.categorias.find_one(
                {"_id": u["categoria"]})
            u["categoria"] = categoria_obj["nombre"] if categoria_obj else "Sin categoría"
        else:
            # Asignar un valor por defecto si no tiene categoría
            u["categoria"] = "Sin categoría"

        users_list.append(u)

    return {
        "total": total_users,
        "page": page,
        "limit": limit,
        "users": users_list
    }


class BuscarClienteRequest(BaseModel):
    nombre: str

# Lo busca por username


@router.post("/buscar", dependencies=[Depends(verify_csrf)])
async def buscar_clientes(
        request: BuscarClienteRequest,
        user: dict = Depends(current_user)):
    # Obtener el ID del usuario correctamente (tanto si es dict como User)
    user_id = user.get("id") if isinstance(user, dict) else user.id

    # Verificar si el usuario es admin (operaciones síncronas en hilo separado)
    user_db_data = await asyncio.to_thread(
        lambda: db_client.users.find_one({"_id": ObjectId(user_id)})
    )
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    admin_data = await asyncio.to_thread(
        lambda: db_client.admins.find_one({"user": user_db_data["_id"]})
    )
    if not admin_data:
        raise HTTPException(status_code=403,
                            detail="Solo los admin pueden buscar clientes")

    try:
        # Buscar clientes (en hilo separado)
        clientes = await asyncio.to_thread(
            lambda: list(db_client.users.find({"username": {"$regex": f"^{request.nombre}", "$options": "i"}}))
        )

        # Procesar resultados
        clientes_procesados = []
        for cliente in clientes:
            categoria_nombre = None

            # Si tiene categoría, buscamos su nombre
            if cliente.get("categoria"):
                categoria_obj = db_client.categorias.find_one(
                    {"_id": cliente["categoria"]})
                if categoria_obj:
                    categoria_nombre = categoria_obj.get("nombre")

            clientes_procesados.append({
                "_id": str(cliente.get("_id")),
                "nombre": cliente.get("nombre"),
                "apellido": cliente.get("apellido"),
                "username": cliente.get("username"),
                "email": cliente.get("email"),
                "habilitado": cliente.get("habilitado"),
                "fecha_registro": cliente.get("fecha_registro"),
                "ultima_conexion": cliente.get("ultima_conexion"),
                "categoria": categoria_nombre if categoria_nombre else None,
            })

        return {"clientes": clientes_procesados}

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Error al buscar clientes: {str(e)}")


class ModificarUsuarioRequest(BaseModel):
    identificador: str
    nombre: str
    apellido: str
    email: str
    habilitado: bool
    categoria: str


@router.post("/modificar", dependencies=[Depends(verify_csrf)])
async def modificar_usuario(
        data: ModificarUsuarioRequest,
        user: dict = Depends(current_user)):
    try:
        user_id = ObjectId(data.identificador)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    print(f"Intentando modificar usuario con datos: {data}")
    print(f"Usuario actual: {user}")
    
    def operaciones_sincronas():
        current_user_data = db_client.users.find_one(
            {"_id": ObjectId(user["id"])})
        if not current_user_data:
            raise ValueError("Usuario no encontrado")

        is_admin = db_client.admins.find_one(
            {"user": current_user_data["_id"]})
        if not is_admin:
            raise ValueError("Solo los admin pueden modificar usuarios")

        # Obtener el usuario actual para comparar el email
        usuario_actual = db_client.users.find_one({"_id": user_id})
        if not usuario_actual:
            raise ValueError("Usuario a modificar no encontrado")

        categoria_obj = None
        if data.categoria and data.categoria not in ["Sin categoría", ""]:
            categoria_obj = db_client.categorias.find_one(
                {"nombre": data.categoria})
            if not categoria_obj:
                raise ValueError(f"Categoría '{data.categoria}' no encontrada")

        update_data = {
            "nombre": data.nombre,
            "apellido": data.apellido,
            "email": data.email,
            "habilitado": data.habilitado,
        }
        
        # Verificar si el email cambió
        email_cambio = usuario_actual["email"] != data.email
        
        if email_cambio:
            # Generar nuevo token y deshabilitar usuario
            nuevo_token = secrets.token_urlsafe(32)
            update_data["habilitacion_token"] = nuevo_token
            update_data["habilitado"] = False
            
            # Enviar email de habilitación al nuevo email
            enviar_email_habilitacion(data.email, nuevo_token)
        
        if categoria_obj:
            update_data["categoria"] = categoria_obj["_id"]
        elif data.categoria in ["Sin categoría", ""]:
            update_data["categoria"] = None

        result = db_client.users.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise ValueError("Usuario a modificar no encontrado")

        return email_cambio

    try:
        email_cambio = await asyncio.to_thread(operaciones_sincronas)
        message = "Usuario actualizado correctamente"
        if email_cambio:
            message += ". Se ha enviado un email de verificación al nuevo correo."
        return {"message": message}

    except ValueError as e:
        raise HTTPException(
            status_code=400 if "no encontrado" in str(e).lower() else 403,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al modificar usuario: {str(e)}"
        )


class EliminarUsuarioRequest(BaseModel):
    identificador: str


@router.get("/categorias")
async def obtener_categorias(user: dict = Depends(current_user)):
    """Endpoint para obtener todas las categorías disponibles"""
    try:
        categorias = await asyncio.to_thread(
            lambda: list(db_client.categorias.find({}, {"_id": 0, "nombre": 1}))
        )
        return {"categorias": [cat["nombre"] for cat in categorias]}
    except Exception as e:
        print(f"Error al obtener categorías: {e}")
        return {"categorias": []}


@router.post("/eliminar", dependencies=[Depends(verify_csrf)])
async def eliminar_usuario(
        data: EliminarUsuarioRequest,
        user: dict = Depends(current_user)):
    try:
        # Convertir el ID del usuario a eliminar
        user_id = ObjectId(data.identificador)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    def operaciones_sincronas():
        # Verificar que el usuario que hace la solicitud existe y es admin
        current_user_data = db_client.users.find_one(
            {"_id": ObjectId(user["id"])})
        if not current_user_data:
            raise ValueError("Usuario no encontrado")

        is_admin = db_client.admins.find_one(
            {"user": current_user_data["_id"]})
        if not is_admin:
            raise ValueError("Solo los admin pueden eliminar usuarios")

        # Verificar que no se está intentando auto-eliminar
        if str(current_user_data["_id"]) == data.identificador:
            raise ValueError("No puedes eliminarte a ti mismo")

        # === ELIMINACIÓN EN CASCADA ===
        
        # 1. Eliminar preferencias del usuario
        db_client.preferencias.delete_many({"usuario_id": user_id})
        
        # 2. Eliminar pesos donde el usuario es i o j
        db_client.pesos.delete_many({"$or": [{"i": user_id}, {"j": user_id}]})
        
        # 3. Eliminar notif_logs donde el usuario es origen o destinatario
        db_client.notif_logs.delete_many({"$or": [{"origen": user_id}, {"usuario": user_id}]})
        
        # 4. Eliminar reseñas donde el usuario es autor (i) o destinatario (j)
        db_client.resenias.delete_many({"$or": [{"i": user_id}, {"j": user_id}]})
        
        # 5. Manejar reservas: eliminar al usuario de la lista de usuarios
        # Si es el único usuario, eliminar la reserva completa
        reservas_usuario = list(db_client.reservas.find({"usuarios.id": user_id}))
        
        for reserva in reservas_usuario:
            # Contar cuántos usuarios tiene la reserva
            cantidad_usuarios = len(reserva.get("usuarios", []))
            
            if cantidad_usuarios == 1:
                # Si es el único usuario, eliminar la reserva completa
                db_client.reservas.delete_one({"_id": reserva["_id"]})
                
                # Cancelar recordatorio si existe
                try:
                    from services.scheduler import cancelar_recordatorio_reserva
                    cancelar_recordatorio_reserva(str(reserva["_id"]))
                except Exception as e:
                    print(f"Error cancelando recordatorio: {e}")
            else:
                # Si hay más usuarios, solo remover al usuario de la lista
                db_client.reservas.update_one(
                    {"_id": reserva["_id"]},
                    {"$pull": {"usuarios": {"id": user_id}}}
                )
        
        # 6. Eliminar de admins si existe
        db_client.admins.delete_one({"user": user_id})
        
        # 7. Eliminar de empleados si existe
        db_client.empleados.delete_one({"user": user_id})
        
        # 8. Finalmente, eliminar el usuario
        result = db_client.users.delete_one({"_id": user_id})
        if result.deleted_count == 0:
            raise ValueError("Usuario no encontrado o ya eliminado")

        return True

    try:
        # Ejecutar operaciones en hilo separado
        await asyncio.to_thread(operaciones_sincronas)
        return {"message": "Usuario y todos sus datos asociados eliminados correctamente"}

    except ValueError as e:
        status_code = 404 if "no encontrado" in str(e).lower() else 403
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar usuario: {str(e)}"
        )


@router.delete("/{user_id}", dependencies=[Depends(verify_csrf)])
async def eliminar_usuario(
    user_id: str,
    user: dict = Depends(current_user)
):
    def operaciones_sincronas():
        current_user_data = db_client.users.find_one(
            {"_id": ObjectId(user["id"])})
        if not current_user_data:
            raise ValueError("Usuario no encontrado")
        is_admin = db_client.admins.find_one(
            {"user": current_user_data["_id"]})
        if not is_admin:
            raise ValueError("Solo los admin pueden eliminar usuarios")
        if str(current_user_data["_id"]) == user_id:
            raise ValueError("No puedes eliminarte a ti mismo")
        
        user_oid = ObjectId(user_id)
        
        # === ELIMINACIÓN EN CASCADA ===
        
        # 1. Eliminar preferencias
        db_client.preferencias.delete_many({"usuario_id": user_oid})
        
        # 2. Eliminar pesos
        db_client.pesos.delete_many({"$or": [{"i": user_oid}, {"j": user_oid}]})
        
        # 3. Eliminar notif_logs
        db_client.notif_logs.delete_many({"$or": [{"origen": user_oid}, {"usuario": user_oid}]})
        
        # 4. Eliminar reseñas
        db_client.resenias.delete_many({"$or": [{"i": user_oid}, {"j": user_oid}]})
        
        # 5. Manejar reservas
        reservas_usuario = list(db_client.reservas.find({"usuarios.id": user_oid}))
        
        for reserva in reservas_usuario:
            cantidad_usuarios = len(reserva.get("usuarios", []))
            
            if cantidad_usuarios == 1:
                db_client.reservas.delete_one({"_id": reserva["_id"]})
                try:
                    from services.scheduler import cancelar_recordatorio_reserva
                    cancelar_recordatorio_reserva(str(reserva["_id"]))
                except Exception as e:
                    print(f"Error cancelando recordatorio: {e}")
            else:
                db_client.reservas.update_one(
                    {"_id": reserva["_id"]},
                    {"$pull": {"usuarios": {"id": user_oid}}}
                )
        
        # 6. Eliminar de admins
        db_client.admins.delete_one({"user": user_oid})
        
        # 7. Eliminar de empleados
        db_client.empleados.delete_one({"user": user_oid})
        
        # 8. Eliminar usuario
        result = db_client.users.delete_one({"_id": user_oid})
        if result.deleted_count == 0:
            raise ValueError("Usuario no encontrado o ya eliminado")
        
        return True

    try:
        await asyncio.to_thread(operaciones_sincronas)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(
            status_code=403 if "eliminarte" in str(e) else 404,
            detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Error al eliminar usuario: {str(e)}")


@router.get("/habilitar")
async def habilitar_usuario(token: str = Query(...)):
    user = await asyncio.to_thread(
        lambda: db_client.users.find_one({"habilitacion_token": token})
    )
    if not user:
        raise HTTPException(status_code=404, detail="Token inválido")

    await asyncio.to_thread(
        lambda: db_client.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"habilitado": True, "habilitacion_token": None}}
        )
    )
    # Redirige al usuario al frontend (URL ABSOLUTA)
    return RedirectResponse(url="https://boulevard81.duckdns.org/habilitado")


@router.put("/{user_id}", dependencies=[Depends(verify_csrf)])
async def editar_usuario(
    user_id: str,
    body: dict = Body(...),
    user: dict = Depends(current_user)
):
    def operaciones_sincronas():
        current_user_data = db_client.users.find_one(
            {"_id": ObjectId(user["id"])})
        if not current_user_data:
            raise ValueError("Usuario no encontrado")
        is_admin = db_client.admins.find_one(
            {"user": current_user_data["_id"]})
        if not is_admin:
            raise ValueError("Solo los admin pueden modificar usuarios")

        usuario_actual = db_client.users.find_one({"_id": ObjectId(user_id)})
        if not usuario_actual:
            raise ValueError("Usuario a modificar no encontrado")

        categoria_nombre = body.get("categoria")
        categoria_obj = None
        if categoria_nombre and categoria_nombre not in ["Sin categoría", ""]:
            categoria_obj = db_client.categorias.find_one(
                {"nombre": categoria_nombre})
            if not categoria_obj:
                raise ValueError(
                    f"Categoría '{categoria_nombre}' no encontrada")

        update_data = {
            "nombre": body.get("nombre"),
            "apellido": body.get("apellido"),
            "email": body.get("email"),
            "habilitado": body.get("habilitado")
        }

        email_cambio = usuario_actual["email"] != body.get("email")

        if email_cambio:
            nuevo_token = secrets.token_urlsafe(32)
            update_data["habilitacion_token"] = nuevo_token
            update_data["habilitado"] = False
            enviar_email_habilitacion(body.get("email"), nuevo_token)
            
        if categoria_obj:
            update_data["categoria"] = categoria_obj["_id"]
        else:
            update_data["categoria"] = None

        result = db_client.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise ValueError("Usuario a modificar no encontrado")
        return email_cambio

    try:
        email_cambio = await asyncio.to_thread(operaciones_sincronas)
        response = {"success": True}
        if email_cambio:
            response["message"] = "Se ha enviado un email de verificación al nuevo correo."
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Error al modificar usuario: {str(e)}")


class EditarPerfilRequest(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr


@router.put("/me/", dependencies=[Depends(verify_csrf)])
async def editar_perfil(
    request: Request,
    user: dict = Depends(current_user)
):
    body = await request.json()
    try:
        data = EditarPerfilRequest(**body)
    except Exception as e:
        print("Error de validación:", e)
        raise HTTPException(status_code=400, detail=str(e))

    def operaciones_sincronas():
        usuario_actual = db_client.users.find_one({"_id": ObjectId(user["id"])})
        if not usuario_actual:
            raise ValueError("Usuario no encontrado")

        update_data = {
            "nombre": data.nombre,
            "apellido": data.apellido,
            "email": data.email,
        }

        email_cambio = usuario_actual["email"] != data.email
        if email_cambio:
            nuevo_token = secrets.token_urlsafe(32)
            update_data["habilitacion_token"] = nuevo_token
            update_data["habilitado"] = False
            enviar_email_habilitacion(data.email, nuevo_token)

        result = db_client.users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise ValueError("Usuario no encontrado")
        return email_cambio

    try:
        email_cambio = await asyncio.to_thread(operaciones_sincronas)
        message = "Perfil actualizado correctamente"
        if email_cambio:
            message += ". Se ha enviado un email de verificación al nuevo correo."
        return {"message": message}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al modificar perfil: {str(e)}")


@router.get("/perfil")
async def obtener_perfil(user: dict = Depends(current_user)):
    usuario = await asyncio.to_thread(
        lambda: db_client.users.find_one({"_id": ObjectId(user["id"])})
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Obtener el nombre de la categoría si existe
    categoria_nombre = None
    if usuario.get("categoria"):
        categoria_obj = db_client.categorias.find_one({"_id": usuario["categoria"]})
        if categoria_obj:
            categoria_nombre = categoria_obj.get("nombre")
    else:
        categoria_nombre = "Sin categoría"

    return {
        "nombre": usuario.get("nombre"),
        "apellido": usuario.get("apellido"),
        "username": usuario.get("username"),
        "email": usuario.get("email"),
        "habilitado": usuario.get("habilitado"),
        "fecha_registro": usuario.get("fecha_registro"),
        "ultima_conexion": usuario.get("ultima_conexion"),
        "categoria": categoria_nombre
    }

# TODO: deberia tener como maximo X cantidad
# Actualmente lo devuelve todo  :o
@router.get("/jugadores_con_quienes_jugo")
async def jugadores_con_quienes_jugo(user: dict = Depends(current_user)):
    user_id = ObjectId(user["id"])

    def obtener_jugadores():
        estado = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
        if not estado:
            return []

        match = {"usuarios.id": user_id, "estado": estado["_id"]}
        reservas_usuario = list(db_client.reservas.find(match, {"usuarios": 1}))

        otros_ids = set()
        for reserva in reservas_usuario:
            for u in reserva.get("usuarios", []):
                uid = u.get("id")
                if uid and uid != user_id:
                    otros_ids.add(uid)

        usuarios = list(db_client.users.find({"_id": {"$in": list(otros_ids)}}))
        resultado = []
        for u in usuarios:
            resultado.append({
                "id": str(u["_id"]),
                "nombre": u.get("nombre"),
                "apellido": u.get("apellido"),
                "username": u.get("username"),
                "email": u.get("email"),
            })
        return resultado

    jugadores = await asyncio.to_thread(obtener_jugadores)
    return {"jugadores": jugadores}
