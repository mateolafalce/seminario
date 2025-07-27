from pydantic import BaseModel
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import current_user


class PreferenciasInput(BaseModel):
    dias: List[str]
    horarios: List[str]
    canchas: List[str]


router = APIRouter(prefix="/preferencias", tags=["Preferencias"])


@router.post("/guardar")
async def guardar_preferencias(
        preferencias: PreferenciasInput,
        user: dict = Depends(current_user)):
    # Validar si el usuario está habilitado para hacer reservas
    if user.get("habilitado") is not True:
        raise HTTPException(
            status_code=403,
            detail="Usuario no habilitado para hacer reservas")

    # Validación del usuario
    if not user or not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # >>> INICIO: Lógica para limitar a 7 preferencias <<<
    user_id = ObjectId(user["id"])
    if db_client.preferencias.count_documents({"usuario_id": user_id}) >= 7:
        raise HTTPException(
            status_code=400,
            detail="Has alcanzado el límite máximo de 7 preferencias.")
    # >>> FIN: Lógica para limitar a 7 preferencias <<<

    # Validaciones contra la base de datos
    dias_validos = db_client.dias.find()  # Obtener todos los días válidos
    # Obtener todos los horarios válidos
    horarios_validos = db_client.horarios.find()
    canchas_validas = db_client.canchas.find()  # Obtener todas las canchas válidas

    # Crear diccionarios para obtener los OIDs
    dias_oid_map = {dia["nombre"]: dia["_id"] for dia in dias_validos}
    horarios_oid_map = {hora["hora"]: hora["_id"] for hora in horarios_validos}
    canchas_oid_map = {cancha["nombre"]: cancha["_id"]
                       for cancha in canchas_validas}

    # Convertir los nombres de días, horarios y canchas a OIDs
    dias_invalidos = []
    horarios_invalidos = []
    canchas_invalidas = []

    # Reemplazar los nombres por los OIDs y verificar si son válidos
    dias_oid = []
    for dia in preferencias.dias:
        if dia in dias_oid_map:
            dias_oid.append(dias_oid_map[dia])
        else:
            dias_invalidos.append(dia)

    horarios_oid = []
    for hora in preferencias.horarios:
        if hora in horarios_oid_map:
            horarios_oid.append(horarios_oid_map[hora])
        else:
            horarios_invalidos.append(hora)

    canchas_oid = []
    for cancha in preferencias.canchas:
        if cancha in canchas_oid_map:
            canchas_oid.append(canchas_oid_map[cancha])
        else:
            canchas_invalidas.append(cancha)

    # Si hay elementos inválidos, devolver un error
    if dias_invalidos or horarios_invalidos or canchas_invalidas:
        raise HTTPException(
            status_code=400,
            detail={
                "dias_invalidos": dias_invalidos,
                "horarios_invalidos": horarios_invalidos,
                "canchas_invalidas": canchas_invalidas
            }
        )

    # Insertar siempre nuevas preferencias
    nueva_preferencia = {
        "usuario_id": ObjectId(user["id"]),
        "dias": dias_oid,  # Guardar los OIDs de los días
        "horarios": horarios_oid,  # Guardar los OIDs de los horarios
        "canchas": canchas_oid  # Guardar los OIDs de las canchas
    }

    # Insertar las preferencias en la base de datos
    db_client.preferencias.insert_one(nueva_preferencia)

    return {"msg": "Preferencias guardadas con éxito"}


@router.get("/obtener")
async def obtener_preferencias(user: dict = Depends(current_user)):
    # Validar si el usuario está habilitado para hacer reservas
    if user.get("habilitado") is not True:
        raise HTTPException(
            status_code=403,
            detail="Usuario no habilitado para hacer reservas")

    # Validación del usuario
    if not user or not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # Buscar las preferencias del usuario en la base de datos
    preferencias_cursor = db_client.preferencias.find(
        {"usuario_id": ObjectId(user["id"])})

    preferencias_list = []
    for preferencia in preferencias_cursor:
        # Obtener los OIDs de las preferencias
        dias_oid = preferencia.get("dias", [])
        horarios_oid = preferencia.get("horarios", [])
        canchas_oid = preferencia.get("canchas", [])

        # Obtener los nombres correspondientes a los OIDs
        dias_nombres = [dia["nombre"]
                        for dia in db_client.dias.find({"_id": {"$in": dias_oid}})]
        horarios_nombres = [hora["hora"] for hora in db_client.horarios.find(
            {"_id": {"$in": horarios_oid}})]
        canchas_nombres = [cancha["nombre"] for cancha in db_client.canchas.find(
            {"_id": {"$in": canchas_oid}})]

        # Agregar las preferencias procesadas a la lista
        preferencias_list.append({
            # Devolver el ID para poder eliminarla
            "id": str(preferencia["_id"]),
            "dias": dias_nombres,
            "horarios": horarios_nombres,
            "canchas": canchas_nombres
        })

    # Retornar las preferencias en el formato esperado
    return preferencias_list


@router.put("/modificar/{preferencia_id}")
async def modificar_preferencia(
        preferencia_id: str,
        preferencias: PreferenciasInput,
        user: dict = Depends(current_user)):
    if not ObjectId.is_valid(preferencia_id):
        raise HTTPException(
            status_code=400,
            detail="ID de preferencia inválido")

    # >>> INICIO: Validación de campos no vacíos <<<
    if not preferencias.dias or not preferencias.horarios or not preferencias.canchas:
        raise HTTPException(
            status_code=400,
            detail="Una preferencia debe tener al menos un día, un horario y una cancha.")
    # >>> FIN: Validación de campos no vacíos <<<

    preferencia_oid = ObjectId(preferencia_id)

    # Buscar la preferencia para asegurarse de que pertenece al usuario actual
    preferencia_a_modificar = db_client.preferencias.find_one(
        {"_id": preferencia_oid, "usuario_id": ObjectId(user["id"])}
    )

    if not preferencia_a_modificar:
        raise HTTPException(
            status_code=404,
            detail="Preferencia no encontrada o no tienes permiso para modificarla")

    # Reutilizar la lógica de conversión de nombres a OIDs
    dias_validos = db_client.dias.find()
    horarios_validos = db_client.horarios.find()
    canchas_validas = db_client.canchas.find()
    dias_oid_map = {dia["nombre"]: dia["_id"] for dia in dias_validos}
    horarios_oid_map = {hora["hora"]: hora["_id"] for hora in horarios_validos}
    canchas_oid_map = {cancha["nombre"]: cancha["_id"]
                       for cancha in canchas_validas}

    dias_oid = [dias_oid_map[dia]
                for dia in preferencias.dias if dia in dias_oid_map]
    horarios_oid = [horarios_oid_map[hora]
                    for hora in preferencias.horarios if hora in horarios_oid_map]
    canchas_oid = [canchas_oid_map[cancha]
                   for cancha in preferencias.canchas if cancha in canchas_oid_map]

    # Actualizar la preferencia
    db_client.preferencias.update_one(
        {"_id": preferencia_oid},
        {"$set": {
            "dias": dias_oid,
            "horarios": horarios_oid,
            "canchas": canchas_oid
        }}
    )

    return {"msg": "Preferencia actualizada con éxito"}


@router.delete("/eliminar/{preferencia_id}")
async def eliminar_preferencia(
        preferencia_id: str,
        user: dict = Depends(current_user)):
    if not ObjectId.is_valid(preferencia_id):
        raise HTTPException(
            status_code=400,
            detail="ID de preferencia inválido")

    preferencia_oid = ObjectId(preferencia_id)

    # Buscar la preferencia para asegurarse de que pertenece al usuario actual
    preferencia_a_eliminar = db_client.preferencias.find_one(
        {"_id": preferencia_oid, "usuario_id": ObjectId(user["id"])}
    )

    if not preferencia_a_eliminar:
        raise HTTPException(
            status_code=404,
            detail="Preferencia no encontrada o no tienes permiso para eliminarla")

    # Eliminar la preferencia
    result = db_client.preferencias.delete_one({"_id": preferencia_oid})

    if result.deleted_count == 1:
        return {"msg": "Preferencia eliminada con éxito"}

    raise HTTPException(
        status_code=500,
        detail="Error al eliminar la preferencia")
