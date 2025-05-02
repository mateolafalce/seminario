from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from routers.defs import *
from db.models.user import User,UserDB
from db.client import db_client
from routers.Security.auth import current_user
from pydantic import BaseModel
from bson import ObjectId
import asyncio
from datetime import datetime
import pytz

router = APIRouter(prefix="/users_b",
                    tags=["usuarios_b"],
                    responses={status.HTTP_400_BAD_REQUEST:{"message":"No encontrado"}})
ALGORITHM = "HS256"
ACCESS_TOKEN_DURATION = 5
SECRET = "201d573bd7d1344d3a3bfce1550b69102fd11be3db6d379508b6cccc58ea230b"
crypt = CryptContext(schemes=["bcrypt"])

# TODO: validar que un admin no pueda borrarse a si mismo xd

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

    # Hashear la contraseña
    hashed_password = crypt.hash(user.password)
    user_dict["password"] = hashed_password

    user_dict["habilitado"] = False
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    fecha_argentina = datetime.now(argentina_tz).strftime("%Y-%m-%d %H:%M:%S")
    user_dict["fecha_registro"] = fecha_argentina
    user_dict["ultima_conexion"] = None
    user_dict["categoria"] = None

    id = db_client.users.insert_one(user_dict).inserted_id

    new_user_data = db_client.users.find_one({"_id": id})
    new_user = user_schema_db(new_user_data)
    access_token = {
        "sub": new_user["username"],
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_DURATION)
    }

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

def check_admin(user_id: str):
    try:
        admin = db_client.admins.find_one({"user": ObjectId(user_id)})
        return admin is not None
    except Exception as e:
        print(f"Error al verificar el administrador: {e}")
        return False

@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user_db_data = await asyncio.to_thread(
        lambda: db_client.users.find_one({"username": form.username})
    )

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    fecha_argentina = datetime.now(argentina_tz).strftime("%Y-%m-%d %H:%M:%S")

    if user_db_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Usuario o contraseña incorrectos"
        )
    
    # Verificar contraseña
    if not crypt.verify(form.password, user_db_data["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Usuario o contraseña incorrectos"
        )

    # Actualizar el campo ultima_conexion
    await asyncio.to_thread(
        lambda: db_client.users.update_one(
            {"_id": user_db_data["_id"]},
            {"$set": {"ultima_conexion": fecha_argentina}}
        )
    )
    
    # Generar token JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_DURATION)
    access_token = jwt.encode(
        {
            "sub": user_db_data["username"], 
            "id": str(user_db_data["_id"]),  
            "exp": datetime.utcnow() + access_token_expires
        },
        SECRET,
        algorithm=ALGORITHM
    )

    is_admin = await asyncio.to_thread(
        lambda: check_admin(user_db_data["_id"])
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user_db_data["_id"]),
        "username": user_db_data["username"],
        "is_admin": is_admin,
        "habilitado": user_db_data["habilitado"]
    }

@router.get("/me")
async def me(user: User = Depends(current_user)):
    return user

class BuscarClienteRequest(BaseModel):
    nombre: str

# Lo busca por username
# TODO se debria poder buscar por nombre y apellido
@router.post("/buscar")
async def buscar_clientes(request: BuscarClienteRequest, user: dict = Depends(current_user)):
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
        raise HTTPException(status_code=403, detail="Solo los admin pueden buscar clientes")

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
                categoria_obj = db_client.categorias.find_one({"_id": cliente["categoria"]})
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
        raise HTTPException(status_code=500, detail=f"Error al buscar clientes: {str(e)}")
        
class ModificarUsuarioRequest(BaseModel):
    identificador: str
    nombre: str
    apellido: str
    email: str
    habilitado: bool
    categoria: str

@router.post("/modificar")
async def modificar_usuario(data: ModificarUsuarioRequest, user: dict = Depends(current_user)):
    try:
        # Convertir el ID del usuario a modificar
        user_id = ObjectId(data.identificador)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    # Verificar que el usuario actual es admin
    def operaciones_sincronas():
        # Obtener datos del usuario que hace la solicitud
        current_user_data = db_client.users.find_one({"_id": ObjectId(user["id"])})
        if not current_user_data:
            raise ValueError("Usuario no encontrado")

        # Verificar si es admin
        is_admin = db_client.admins.find_one({"user": current_user_data["_id"]})
        if not is_admin:
            raise ValueError("Solo los admin pueden modificar usuarios")

        categoria_obj = db_client.categorias.find_one({"nombre": data.categoria})
        if not categoria_obj:
            raise ValueError(f"Categoría '{data.categoria}' no encontrada")

        update_data = {
            "nombre": data.nombre,
            "apellido": data.apellido,
            "email": data.email,
            "habilitado": data.habilitado,
            "categoria": categoria_obj["_id"],
        }

        result = db_client.users.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise ValueError("Usuario a modificar no encontrado")
        
        return True

    try:
        # Ejecutar operaciones en hilo separado
        await asyncio.to_thread(operaciones_sincronas)
        return {"message": "Usuario actualizado correctamente"}
    
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

@router.post("/eliminar")
async def eliminar_usuario(data: EliminarUsuarioRequest, user: dict = Depends(current_user)):
    try:
        # Convertir el ID del usuario a eliminar
        user_id = ObjectId(data.identificador)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    def operaciones_sincronas():
        # Verificar que el usuario que hace la solicitud existe y es admin
        current_user_data = db_client.users.find_one({"_id": ObjectId(user["id"])})
        if not current_user_data:
            raise ValueError("Usuario no encontrado")

        is_admin = db_client.admins.find_one({"user": current_user_data["_id"]})
        if not is_admin:
            raise ValueError("Solo los admin pueden eliminar usuarios")

        # Verificar que no se está intentando auto-eliminar
        if str(current_user_data["_id"]) == data.identificador:
            raise ValueError("No puedes eliminarte a ti mismo")

        result = db_client.users.delete_one({"_id": user_id})
        if result.deleted_count == 0:
            raise ValueError("Usuario no encontrado o ya eliminado")
        
        db_client.admins.delete_one({"user": user_id})
        
        return True

    try:
        # Ejecutar operaciones en hilo separado
        await asyncio.to_thread(operaciones_sincronas)
        return {"message": "Usuario eliminado correctamente"}
    
    except ValueError as e:
        status_code = 404 if "no encontrado" in str(e).lower() else 403
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar usuario: {str(e)}"
        )