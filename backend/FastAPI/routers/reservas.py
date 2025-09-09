from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from routers.defs import *
from db.models.user import User, UserDB
from db.client import db_client
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from routers.users_b import *
from bson import ObjectId
from datetime import datetime
from typing import List, Dict
from fastapi.responses import JSONResponse
import asyncio
import pytz  
from datetime import datetime, timedelta
from services.matcheo import a_notificar
from services.email import notificar_posible_matcheo

class Reserva(BaseModel):
    cancha: str
    horario: str
    fecha: str 

router = APIRouter(prefix="/reservas",
                   tags=["reservas"],
                   responses={404: {"message": "No encontrado"}})


def clean_mongo_doc(doc):
    doc["_id"] = str(doc["_id"])
    if "cancha" in doc:
        doc["cancha"] = str(doc["cancha"])
    if "usuario" in doc:
        doc["usuario"] = str(doc["usuario"])
    if "hora_inicio" in doc:
        doc["hora_inicio"] = str(doc["hora_inicio"])
    if "estado" in doc:
        doc["estado"] = str(doc["estado"])
    if "notificacion_id" in doc and doc["notificacion_id"]:
        doc["notificacion_id"] = str(doc["notificacion_id"])
    return doc


@router.post("/reservar")
async def reservar(reserva: Reserva, user: dict = Depends(current_user)):
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")

    try:
        # --- Validación de la fecha ---
        fecha_reserva_dt = datetime.strptime(reserva.fecha, "%d-%m-%Y").date()
        ahora_dt = datetime.now(argentina_tz)
        hoy_dt = ahora_dt.date()
        limite_dt = hoy_dt + timedelta(days=7)

        if not (hoy_dt <= fecha_reserva_dt < limite_dt):
            raise ValueError(
                "La fecha de reserva debe ser entre hoy y los próximos 6 días.")

        # --- Validación de horarios pasados (solo para el día de hoy) ---
        if fecha_reserva_dt == hoy_dt:
            hora_inicio_str = reserva.horario.split('-')[0]  # "09:00"
            hora_reserva_dt = ahora_dt.replace(
                hour=int(hora_inicio_str.split(':')[0]),
                minute=int(hora_inicio_str.split(':')[1]),
                second=0,
                microsecond=0
            )
            if (hora_reserva_dt - ahora_dt) < timedelta(hours=1):
                raise ValueError(
                    "No puedes reservar en un horario que ya pasó o con menos de 1 hora de antelación.")

        # Verificar que tenemos un ID de usuario válido
        if not user.get("id") or not ObjectId.is_valid(user["id"]):
            raise HTTPException(
                status_code=400,
                detail="ID de usuario no válido")

        # Validar si el usuario está habilitado para hacer reservas
        if user.get("habilitado") is not True:
            raise HTTPException(
                status_code=403,
                detail="Usuario no habilitado para hacer reservas")

        def operaciones_sincronas():
            # Validar si el horario existe
            horario_doc = db_client.horarios.find_one({"hora": reserva.horario})
            if not horario_doc:
                raise ValueError("Horario inválido")
            horario_id = horario_doc["_id"]

            # --- VALIDACIÓN: máximo 2 reservas activas ---
            estado_reservada = db_client.estadoreserva.find_one({"nombre": "Reservada"})
            if not estado_reservada:
                raise ValueError('No se encontró el estado "Reservada"')
            estado_reservada_id = estado_reservada["_id"]

            reservas_activas = db_client.reservas.count_documents({
                "usuario": ObjectId(user["id"]),
                "estado": estado_reservada_id
            })
            if reservas_activas >= 2:
                raise ValueError("No puedes tener más de 2 reservas activas.")

            # Validar que el usuario no tenga una reserva en el mismo horario y fecha con estado "Reservada"
            reserva_existente = db_client.reservas.find_one({
                "usuario": ObjectId(user["id"]),
                "fecha": reserva.fecha,
                "hora_inicio": ObjectId(horario_id),
                "estado": estado_reservada_id
            })
            if reserva_existente:
                raise ValueError("Ya tenés una reserva en ese horario y fecha")

            # Buscar la cancha por nombre y obtener ID
            cancha_doc = db_client.canchas.find_one({"nombre": reserva.cancha})
            if not cancha_doc:
                raise ValueError("Cancha inválida")
            cancha_id = cancha_doc["_id"]

            # --- Si existe una reserva cancelada, reactivar ---
            estado_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
            if not estado_cancelada:
                raise ValueError('No se encontró el estado "Cancelada"')
            estado_cancelada_id = estado_cancelada["_id"]

            reserva_cancelada = db_client.reservas.find_one({
                "usuario": ObjectId(user["id"]),
                "fecha": reserva.fecha,
                "hora_inicio": ObjectId(horario_id),
                "cancha": cancha_id,
                "estado": estado_cancelada_id
            })
            
            # Obtener datos del usuario que hace la reserva para el email
            usuario_data = db_client.users.find_one({"_id": ObjectId(user["id"])})
            nombre_usuario = usuario_data.get("nombre", "Usuario")
            apellido_usuario = usuario_data.get("apellido", "Apellido")
            
            hora_inicio_str = reserva.horario.split('-')[0]
            
            if reserva_cancelada:
                # Actualizar estado de la reserva cancelada
                update_data = {"estado": estado_reservada_id}
                
                # Crear notificación para reserva reactivada
                notificacion_id = None
                try:
                    usuarios_a_notificar = a_notificar(user["id"])
                    if usuarios_a_notificar:
                        notificacion = {
                            "i": ObjectId(user["id"]),
                            "j": [ObjectId(uid) for uid in usuarios_a_notificar if ObjectId.is_valid(uid)],
                        }
                        result_notif = db_client.notificaciones.insert_one(notificacion)
                        notificacion_id = result_notif.inserted_id
                        update_data["notificacion_id"] = notificacion_id
                        
                        # Enviar emails a usuarios notificados
                        for usuario_id in usuarios_a_notificar:
                            if ObjectId.is_valid(usuario_id):
                                usuario_notificado = db_client.users.find_one({"_id": ObjectId(usuario_id)})
                                if usuario_notificado:
                                    notificar_posible_matcheo(
                                        to=usuario_notificado["email"],
                                        day=reserva.fecha,
                                        hora=reserva.horario,
                                        cancha=reserva.cancha
                                    )
                except Exception as e:
                    print(f"Error creando notificación para reserva reactivada: {e}")
                
                result = db_client.reservas.update_one(
                    {"_id": reserva_cancelada["_id"]},
                    {"$set": update_data}
                )
                
                if result.modified_count == 1:
                    reserva_cancelada["estado"] = estado_reservada_id
                    reserva_cancelada["_id"] = str(reserva_cancelada["_id"])
                    if notificacion_id:
                        reserva_cancelada["notificacion_id"] = str(notificacion_id)
                    
                    # Programar recordatorio para reserva reactivada
                    try:
                        from services.scheduler import programar_recordatorio_nueva_reserva
                        programar_recordatorio_nueva_reserva(
                            str(reserva_cancelada["_id"]), 
                            reserva.fecha, 
                            hora_inicio_str
                        )
                    except Exception as e:
                        print(f"Error programando recordatorio para reserva reactivada: {e}")
                    
                    return reserva_cancelada
                else:
                    raise ValueError("No se pudo reactivar la reserva cancelada.")

            # Validar disponibilidad
            filtro = {
                "$and": [
                    {"cancha": cancha_id},
                    {"fecha": reserva.fecha},
                    {"hora_inicio": horario_id}
                ]
            }
            conteo = db_client.reservas.count_documents(filtro)
            if conteo >= 6:
                raise ValueError(
                    "No hay cupo disponible para esta cancha en ese horario")

            nueva_reserva = {
                "cancha": cancha_id,
                "fecha": reserva.fecha,
                "hora_inicio": horario_id,
                "usuario": ObjectId(user["id"]),
                "estado": estado_reservada_id,
                "notificacion_id": None, 
                "resultado": None,
                "confirmaciones": []  # Array para almacenar IDs de usuarios que han confirmado
            }

            result = db_client.reservas.insert_one(nueva_reserva)
            nueva_reserva["_id"] = str(result.inserted_id)
            
            # Crear notificación para nueva reserva
            try:
                usuarios_a_notificar = a_notificar(user["id"])
                if usuarios_a_notificar:
                    notificacion = {
                        "i": ObjectId(user["id"]),
                        "j": [ObjectId(uid) for uid in usuarios_a_notificar if ObjectId.is_valid(uid)]
                    }
                    result_notif = db_client.notificaciones.insert_one(notificacion)
                    
                    # Actualizar la reserva con el ID de la notificación
                    db_client.reservas.update_one(
                        {"_id": result.inserted_id},
                        {"$set": {"notificacion_id": result_notif.inserted_id}}
                    )
                    
                    nueva_reserva["notificacion_id"] = str(result_notif.inserted_id)
                    
                    # Enviar emails a usuarios notificados
                    for usuario_id in usuarios_a_notificar:
                        if ObjectId.is_valid(usuario_id):
                            usuario_notificado = db_client.users.find_one({"_id": ObjectId(usuario_id)})
                            if usuario_notificado:
                                notificar_posible_matcheo(
                                    to=usuario_notificado["email"],
                                    day=reserva.fecha,
                                    hora=reserva.horario,
                                    cancha=reserva.cancha
                                )
            except Exception as e:
                print(f"Error creando notificación para nueva reserva: {e}")
            
            # Programar recordatorio para nueva reserva
            try:
                from services.scheduler import programar_recordatorio_nueva_reserva
                programar_recordatorio_nueva_reserva(
                    nueva_reserva["_id"], 
                    reserva.fecha, 
                    hora_inicio_str
                )
            except Exception as e:
                print(f"Error programando recordatorio para nueva reserva: {e}")
            
            return nueva_reserva

        resultado = await asyncio.to_thread(operaciones_sincronas)
        return {
            "msg": "Reserva guardada",
            "reserva": clean_mongo_doc(resultado)
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al guardar la reserva: {str(e)}"
        )


@router.get("/mis-reservas")
async def get_mis_reservas(user: dict = Depends(current_user)):
    user_id = ObjectId(user["id"])

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    ahora = datetime.now(argentina_tz)

    # Obtener el estado "Reservada"
    estado_reservada = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    if not estado_reservada:
        raise HTTPException(status_code=500, detail='No se encontró el estado "Reservada"')
    estado_reservada_id = estado_reservada["_id"]

    pipeline = [
        {"$match": {"usuario": user_id, "estado": estado_reservada_id}},
        {"$lookup": {"from": "canchas", "localField": "cancha", "foreignField": "_id", "as": "cancha_info"}},
        {"$unwind": "$cancha_info"},
        {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
        {"$unwind": "$horario_info"},
        {"$project": {
            "_id": 1, 
            "fecha": 1, 
            "cancha": "$cancha_info.nombre", 
            "horario": "$horario_info.hora",
            "confirmaciones": 1  # AÑADIR ESTE CAMPO
        }},
        {"$sort": {"fecha": 1, "horario": 1}}
    ]

    reservas_cursor = await asyncio.to_thread(lambda: list(db_client.reservas.aggregate(pipeline)))

    reservas_list = []
    for r in reservas_cursor:
        # Construir datetime de la reserva
        fecha_str = r["fecha"]
        hora_inicio_str = r["horario"].split('-')[0]
        reserva_dt = argentina_tz.localize(datetime.strptime(f"{fecha_str} {hora_inicio_str}", "%d-%m-%Y %H:%M"))
        if reserva_dt >= ahora:
            r["_id"] = str(r["_id"])
            
            # AÑADIR ESTE BLOQUE: Verificar si el usuario ya confirmó asistencia
            confirmaciones = r.get("confirmaciones", [])
            r["asistenciaConfirmada"] = user_id in confirmaciones
            
            # Opcional: eliminar el array de confirmaciones del resultado
            if "confirmaciones" in r:
                del r["confirmaciones"]
                
            reservas_list.append(r)

    return reservas_list


@router.delete("/cancelar/{reserva_id}")
async def cancelar_reserva(
        reserva_id: str,
        user: dict = Depends(current_user)):
    if not ObjectId.is_valid(reserva_id):
        raise HTTPException(status_code=400, detail="ID de reserva inválido")

    reserva_oid = ObjectId(reserva_id)
    user_id = user.get("id")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID de usuario no válido")

    # Verificar si el usuario es admin
    user_db_data = await asyncio.to_thread(
        lambda: db_client.users.find_one({"_id": ObjectId(user_id)})
    )
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    admin_data = await asyncio.to_thread(
        lambda: db_client.admins.find_one({"user": user_db_data["_id"]})
    )
    es_admin = bool(admin_data)

    # El admin puede cancelar cualquier reserva, el usuario solo la propia
    filtro = {"_id": reserva_oid}
    if not es_admin:
        filtro["usuario"] = ObjectId(user_id)

    print("Intentando cancelar reserva:", reserva_id)
    print("Filtro usado:", filtro)
    print("Es admin:", es_admin)
    reserva = await asyncio.to_thread(
        lambda: db_client.reservas.find_one(filtro)
    )
    print("Reserva encontrada:", reserva)

    if not reserva:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada o no tienes permiso para cancelarla")

    # Obtener horario para calcular la fecha/hora de la reserva
    horario_doc = await asyncio.to_thread(lambda: db_client.horarios.find_one({"_id": reserva["hora_inicio"]}))
    hora_inicio_str = horario_doc["hora"].split('-')[0]

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    reserva_dt_str = f"{reserva['fecha']} {hora_inicio_str}"
    reserva_dt = datetime.strptime(reserva_dt_str, "%d-%m-%Y %H:%M")
    reserva_dt = argentina_tz.localize(reserva_dt)

    ahora_dt = datetime.now(argentina_tz)

    # Se comprueba si la diferencia entre la hora de la reserva y la hora actual es de al menos 24 horas.
    if (reserva_dt - ahora_dt) >= timedelta(hours=24):
        # Buscar el estado "Cancelada" en la colección estadoreserva
        estado_cancelada = await asyncio.to_thread(
            lambda: db_client.estadoreserva.find_one({"nombre": "Cancelada"})
        )
        if not estado_cancelada:
            raise HTTPException(status_code=500, detail='No se encontró el estado "Cancelada"')
        estado_cancelada_id = estado_cancelada["_id"]

        # Actualizar el estado de la reserva a "Cancelada"
        result = await asyncio.to_thread(
            lambda: db_client.reservas.update_one(
                {"_id": reserva_oid},
                {"$set": {"estado": estado_cancelada_id}}
            )
        )

        if result.modified_count == 1:
            # Cancelar recordatorio programado
            try:
                from services.scheduler import cancelar_recordatorio_reserva
                await asyncio.to_thread(cancelar_recordatorio_reserva, str(reserva_id))
            except Exception as e:
                print(f"Error cancelando recordatorio: {e}")

            # Notificar a otros usuarios con reservas en el mismo slot
            try:
                from services.email import notificar_cancelacion_reserva
                cancha_id = reserva["cancha"]
                fecha = reserva["fecha"]
                hora_inicio_id = reserva["hora_inicio"]

                # Buscar reservas activas en el mismo slot (excluyendo la cancelada)
                estado_reservada = await asyncio.to_thread(
                    lambda: db_client.estadoreserva.find_one({"nombre": "Reservada"})
                )
                reservas_mismo_slot = await asyncio.to_thread(
                    lambda: list(db_client.reservas.find({
                        "cancha": cancha_id,
                        "fecha": fecha,
                        "hora_inicio": hora_inicio_id,
                        "estado": estado_reservada["_id"],
                        "_id": {"$ne": reserva_oid}
                    }))
                )
                for r in reservas_mismo_slot:
                    usuario = await asyncio.to_thread(
                        lambda: db_client.users.find_one({"_id": r["usuario"]})
                    )
                    if usuario and usuario.get("email"):
                        await asyncio.to_thread(
                            notificar_cancelacion_reserva,
                            usuario["email"],
                            fecha,
                            horario_doc["hora"],
                            db_client.canchas.find_one({"_id": cancha_id})["nombre"],
                            usuario["nombre"],
                            usuario["apellido"]
                        )
            except Exception as e:
                print(f"Error notificando cancelación a otros usuarios: {e}")

            return {"msg": "Reserva cancelada con éxito"}
        else:
            raise HTTPException(status_code=500,
                                detail="Error al procesar la cancelación.")
    else:
        # Si queda menos de 24 horas, se deniega la cancelación.
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar la reserva con menos de 24 horas de antelación.")


@router.get("/cantidad")
async def obtener_cantidad_reservas(fecha: str):
    # Validar formato de fecha
    try:
        datetime.strptime(fecha, "%d-%m-%Y")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de fecha inválido. Use DD-MM-YYYY.")

    pipeline = [
        {"$match": {"fecha": fecha}},
        # Traer info del estado
        {"$lookup": {
            "from": "estadoreserva",
            "localField": "estado",
            "foreignField": "_id",
            "as": "estado_info"
        }},
        {"$unwind": "$estado_info"},
        # Filtrar solo reservas que NO estén canceladas
        {"$match": {"estado_info.nombre": {"$ne": "Cancelada"}}},
        {
            "$group": {
                "_id": {"cancha": "$cancha", "hora_inicio": "$hora_inicio"},
                "cantidad": {"$sum": 1}
            }
        },
        {
            "$project": {
                "_id": 0,
                "cancha": "$_id.cancha",
                "hora_inicio": "$_id.hora_inicio",
                "cantidad": 1
            }
        }
    ]

    def obtener_datos():
        reservas_agrupadas = list(db_client.reservas.aggregate(pipeline))
        canchas = {str(c["_id"]): c["nombre"]
                   for c in db_client.canchas.find({}, {"_id": 1, "nombre": 1})}
        horarios = {str(h["_id"]): h["hora"]
                    for h in db_client.horarios.find({}, {"_id": 1, "hora": 1})}
        resultado = []
        for reserva in reservas_agrupadas:
            cancha_nombre = canchas.get(str(reserva["cancha"]))
            horario_nombre = horarios.get(str(reserva["hora_inicio"]))
            # Si no se encuentra, busca el nombre directamente en la reserva (por si hay inconsistencia)
            if not cancha_nombre:
                cancha_doc = db_client.canchas.find_one({"_id": reserva["cancha"]})
                cancha_nombre = cancha_doc["nombre"] if cancha_doc else "Desconocida"
            if not horario_nombre:
                horario_doc = db_client.horarios.find_one({"_id": reserva["hora_inicio"]})
                horario_nombre = horario_doc["hora"] if horario_doc else "Desconocido"
            resultado.append({
                "cancha": cancha_nombre,
                "horario": horario_nombre,
                "cantidad": reserva["cantidad"]
            })
        return resultado

    try:
        resultado = await asyncio.to_thread(obtener_datos)
        return JSONResponse(content=resultado)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener cantidad de reservas: {str(e)}"
        )

def actualizar_reservas_completadas():
    """Actualiza las reservas que ya pasaron de 'Reservada' a 'Completada'"""
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    ahora = datetime.now(argentina_tz)
    
    print(f"🕐 Hora actual: {ahora}")
    print(f"📅 Fecha actual: {ahora.strftime('%d-%m-%Y %H:%M')}")
    
    # Obtener estados
    estado_reservada = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    estado_completada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})

    if not estado_reservada:
        print("❌ No se encontró el estado 'Reservada'")
        return 0
    
    # Pipeline para encontrar reservas que ya pasaron
    pipeline = [
        {"$match": {"estado": estado_reservada["_id"]}},
        {"$lookup": {
            "from": "horarios",
            "localField": "hora_inicio",
            "foreignField": "_id",
            "as": "horario_info"
        }},
        {"$unwind": "$horario_info"},
        {"$addFields": {
            "hora_fin": {
                "$arrayElemAt": [
                    {"$split": ["$horario_info.hora", "-"]}, 1
                ]
            }
        }}
    ]
    
    reservas = list(db_client.reservas.aggregate(pipeline))
    print(f"📋 Se encontraron {len(reservas)} reservas en estado 'Reservada'")
    
    reservas_a_actualizar = []
    datos_entrenamiento = {}  # Dict para almacenar feedback por pares
    
    for reserva in reservas:
        try:
            fecha_str = reserva["fecha"]
            hora_fin_str = reserva["hora_fin"]
            
            print(f"\n🔍 Procesando reserva {reserva['_id']}:")
            print(f"   📅 Fecha: {fecha_str}")
            print(f"   🕐 Hora fin: {hora_fin_str}")
            
            # Convertir fecha DD-MM-YYYY y hora HH:MM a datetime naive
            reserva_fin_dt_naive = datetime.strptime(f"{fecha_str} {hora_fin_str}", "%d-%m-%Y %H:%M")
            print(f"   📅 DateTime naive: {reserva_fin_dt_naive}")
            
            # Localizar en timezone de Argentina
            try:
                reserva_fin_dt = argentina_tz.localize(reserva_fin_dt_naive)
            except ValueError as e:
                print(f"   ⚠️ Ambigüedad de timezone, usando is_dst=None: {e}")
                reserva_fin_dt = argentina_tz.localize(reserva_fin_dt_naive, is_dst=None)
            
            print(f"   🌍 DateTime con timezone: {reserva_fin_dt}")
            print(f"   🕐 Ahora: {ahora}")
            print(f"   ⏰ Diferencia: {ahora - reserva_fin_dt}")
            
            ya_paso = reserva_fin_dt <= ahora
            print(f"   ✅ ¿Ya pasó?: {ya_paso}")
            
            if ya_paso:
                reservas_a_actualizar.append(reserva["_id"])
                print(f"   ➕ Agregada para actualizar")
                
                # Procesar datos para entrenamiento del modelo
                if reserva.get("notificacion_id"):
                    print(f"   🔔 Procesando notificación {reserva['notificacion_id']}")
                    
                    # Buscar la notificación asociada
                    notificacion = db_client.notificaciones.find_one({"_id": reserva["notificacion_id"]})
                    
                    if notificacion:
                        usuario_i = str(notificacion.get("i"))  # Usuario que hizo la reserva
                        usuarios_j = [str(uid) for uid in notificacion.get("j", [])]  # Usuarios notificados
                        
                        print(f"   👤 Usuario i (reservador): {usuario_i}")
                        print(f"   👥 Usuarios j (notificados): {usuarios_j}")
                        
                        # Buscar todas las reservas en la misma cancha, fecha y horario
                        reservas_mismo_slot = list(db_client.reservas.find({
                            "cancha": reserva["cancha"],
                            "fecha": reserva["fecha"],
                            "hora_inicio": reserva["hora_inicio"],
                            "estado": {"$ne": db_client.estadoreserva.find_one({"nombre": "Cancelada"})["_id"]}
                        }))
                        
                        usuarios_que_jugaron = [str(r["usuario"]) for r in reservas_mismo_slot]
                        print(f"   🎮 Usuarios que efectivamente jugaron: {usuarios_que_jugaron}")
                        
                        # Para cada usuario notificado, verificar si jugó
                        for usuario_j in usuarios_j:
                            clave = (usuario_i, usuario_j)
                            
                            if usuario_j in usuarios_que_jugaron:
                                # El usuario notificado sí jugó -> +1
                                datos_entrenamiento[clave] = datos_entrenamiento.get(clave, 0) + 1
                                print(f"   ✅ {usuario_j} fue notificado y SÍ jugó -> +1")
                            else:
                                # El usuario notificado no jugó -> +0
                                datos_entrenamiento[clave] = datos_entrenamiento.get(clave, 0) + 0
                                print(f"   ❌ {usuario_j} fue notificado pero NO jugó -> +0")
                    else:
                        print(f"   ⚠️ No se encontró la notificación {reserva['notificacion_id']}")
                else:
                    print(f"   ℹ️ Reserva sin notificación asociada")
            else:
                print(f"   ⏭️ Aún no ha pasado")
                
        except Exception as e:
            print(f"❌ Error procesando reserva {reserva.get('_id', 'unknown')}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\n📊 Resumen:")
    print(f"   📋 Total reservas revisadas: {len(reservas)}")
    print(f"   ✅ Reservas a actualizar: {len(reservas_a_actualizar)}")
    print(f"   🎯 Pares únicos con feedback: {len(datos_entrenamiento)}")
    
    # Actualizar en lote
    if reservas_a_actualizar:
        print(f"\n🔄 Actualizando {len(reservas_a_actualizar)} reservas...")
        result = db_client.reservas.update_many(
            {"_id": {"$in": reservas_a_actualizar}},
            {"$set": {"estado": estado_completada["_id"]}}
        )
        
        print(f"✅ Se actualizaron {result.modified_count} reservas a estado 'Completada'")
        
        # Entrenar el modelo con los datos recolectados
        if datos_entrenamiento:
            print(f"🤖 Entrenando modelo con {len(datos_entrenamiento)} pares de feedback...")
            print(f"📈 Feedback por pares:")
            for (usuario_i, usuario_j), total in datos_entrenamiento.items():
                print(f"   {usuario_i[:8]}... -> {usuario_j[:8]}...: +{total}")
            
            try:
                from services.matcheo import train_model_with_feedback
                train_model_with_feedback(datos_entrenamiento)
                print("✅ Entrenamiento del modelo completado")
                
            except ImportError:
                print("⚠️ Función train_model_with_feedback no encontrada. Usando optimize_weights como fallback.")
                try:
                    from services.matcheo import optimize_weights
                    optimize_weights()
                    print("✅ Optimización de pesos completada")
                except Exception as e:
                    print(f"❌ Error en optimización de pesos: {e}")
                    import traceback
                    traceback.print_exc()
            except Exception as e:
                print(f"❌ Error en entrenamiento del modelo: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("ℹ️ No hay datos de entrenamiento para procesar")
    else:
        print("ℹ️ No hay reservas para actualizar a estado 'Completada'")
    
    return len(reservas_a_actualizar)

@router.post("/actualizar-estados")
async def trigger_actualizar_estados():
    """Endpoint para activar manualmente la actualización de estados"""
    actualizadas = await asyncio.to_thread(actualizar_reservas_completadas)
    return {"msg": f"Se actualizaron {actualizadas} reservas a estado 'Completada' y se optimizaron los pesos del algoritmo de matcheo"}

@router.post("/enviar-recordatorios")
async def trigger_enviar_recordatorios():
    """Endpoint para activar manualmente el envío de recordatorios"""
    from services.scheduler import enviar_recordatorios_reservas
    recordatorios = await asyncio.to_thread(enviar_recordatorios_reservas)
    return {"msg": f"Se enviaron {recordatorios} recordatorios"}

@router.get("/detalle")
async def detalle_reserva(cancha: str, horario: str, fecha: str, usuario_id: str = None):
    from bson import ObjectId

    cancha_doc = db_client.canchas.find_one({"nombre": cancha})
    horario_doc = db_client.horarios.find_one({"hora": horario})
    if not cancha_doc or not horario_doc:
        raise HTTPException(status_code=404, detail="Cancha u horario no encontrados")

    estado_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
    filtro = {
        "cancha": cancha_doc["_id"],
        "hora_inicio": horario_doc["_id"],
        "fecha": fecha,
        "estado": {"$ne": estado_cancelada["_id"]}  # Excluir canceladas
    }
    reservas = list(db_client.reservas.find(filtro))

    # Si el usuario está logueado, buscar si tiene una reserva cancelada en ese slot
    reserva_cancelada_usuario = None
    if usuario_id and ObjectId.is_valid(usuario_id):
        reserva_cancelada_usuario = db_client.reservas.find_one({
            "cancha": cancha_doc["_id"],
            "hora_inicio": horario_doc["_id"],
            "fecha": fecha,
            "usuario": ObjectId(usuario_id),
            "estado": estado_cancelada["_id"]
        })
        if reserva_cancelada_usuario:
            u = db_client.users.find_one({"_id": ObjectId(usuario_id)})
            if u:
                # Agrega el usuario cancelado a la lista con un indicador
                reservas.append({
                    **reserva_cancelada_usuario,
                    "_usuario_info": {
                        "nombre": u.get("nombre", ""),
                        "apellido": u.get("apellido", ""),
                        "usuario_id": str(u["_id"]),
                        "estado": "Cancelada"
                    }
                })

    usuarios = []
    for r in reservas:
        if "_usuario_info" in r:
            uinfo = r["_usuario_info"]
        else:
            u = db_client.users.find_one({"_id": r["usuario"]})
            uinfo = {
                "nombre": u.get("nombre", ""),
                "apellido": u.get("apellido", ""),
                "usuario_id": str(u["_id"]),
                "estado": "Reservada"  # Por defecto, estado "Reservada"
            } if u else {}
        # Solo incluir usuarios con estado distinto de "Cancelada"
        if uinfo.get("estado") != "Cancelada":
            usuarios.append({
                "nombre": uinfo.get("nombre", ""),
                "apellido": uinfo.get("apellido", ""),
                "reserva_id": str(r["_id"]),
                "usuario_id": uinfo.get("usuario_id", ""),
                "estado": str(r["estado"])
            })

    return {
        "usuarios": usuarios,
        "cancha": cancha,
        "horario": horario,
        "fecha": fecha,
        "cantidad": len(usuarios),  # Solo cuenta usuarios con reservas activas
        "estado_cancelada": str(estado_cancelada["_id"])
    }

@router.get("/listar")
async def listar_reservas_confirmadas(fecha: str):
    """
    Devuelve todas las reservas con estado 'Confirmada' para una fecha dada.
    """
    # Validar formato de fecha
    try:
        datetime.strptime(fecha, "%d-%m-%Y")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de fecha inválido. Use DD-MM-YYYY."
        )

    # Buscar el estado "Confirmada"
    estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if not estado_confirmada:
        raise HTTPException(status_code=500, detail='No se encontró el estado "Confirmada"')
    estado_confirmada_id = estado_confirmada["_id"]

    # Pipeline para traer reservas confirmadas con info de cancha, horario y usuario
    pipeline = [
        {"$match": {"fecha": fecha, "estado": estado_confirmada_id}},
        {"$lookup": {"from": "canchas", "localField": "cancha", "foreignField": "_id", "as": "cancha_info"}},
        {"$unwind": "$cancha_info"},
        {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
        {"$unwind": "$horario_info"},
        {"$lookup": {"from": "users", "localField": "usuario", "foreignField": "_id", "as": "usuario_info"}},
        {"$unwind": "$usuario_info"},
        {"$project": {
            "_id": 1,
            "cancha": "$cancha_info.nombre",
            "horario": "$horario_info.hora",
            "usuario_nombre": "$usuario_info.nombre",
            "usuario_apellido": "$usuario_info.apellido",
            "usuario_id": {"$toString": "$usuario_info._id"},
            "estado": {"$literal": "confirmada"}
        }},
        {"$sort": {"horario": 1}}
    ]

    reservas = await asyncio.to_thread(lambda: list(db_client.reservas.aggregate(pipeline)))
    # Convertir _id a string
    for r in reservas:
        r["_id"] = str(r["_id"])
    return reservas



@router.get("/historial")
async def get_historial_reservas(user: dict = Depends(current_user)):
    """
    Devuelve el historial de reservas confirmadas (partidos ya jugados) de un usuario.
    """
    user_id = ObjectId(user["id"])

    # Buscar el estado "Confirmada"
    estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if not estado_confirmada:
        raise HTTPException(status_code=500, detail='No se encontró el estado "Confirmada"')
    estado_confirmada_id = estado_confirmada["_id"]

    # Pipeline para traer el historial con toda la información necesaria
    pipeline = [
        {"$match": {"usuario": user_id, "estado": estado_confirmada_id}},
        {"$lookup": {"from": "canchas", "localField": "cancha", "foreignField": "_id", "as": "cancha_info"}},
        {"$unwind": "$cancha_info"},
        {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
        {"$unwind": "$horario_info"},
        {"$project": {
            "_id": {"$toString": "$_id"},
            "fecha": 1,
            "cancha": "$cancha_info.nombre",
            "horario": "$horario_info.hora"
            # Puedes añadir más campos si los necesitas, como "resultado"
        }},
        # Ordenamos por fecha descendente para mostrar los más recientes primero
        {"$sort": {"fecha": -1, "horario": -1}}
    ]

    historial = await asyncio.to_thread(lambda: list(db_client.reservas.aggregate(pipeline)))

    return historial

@router.post("/confirmar/{reserva_id}")
async def confirmar_asistencia(reserva_id: str, user: dict = Depends(current_user)):
    """Confirma la asistencia del usuario a una reserva"""
    
    try:
        # Verificar que la reserva exista y sea del usuario
        user_id = ObjectId(user["id"])
        reserva_id_obj = ObjectId(reserva_id)
        
        # Obtener estado confirmado
        estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
        if not estado_confirmada:
            raise HTTPException(status_code=500, detail="Estado 'Confirmada' no encontrado en la base de datos")
            
        # 1. Obtener info básica de la reserva y añadir usuario a confirmaciones con una operación atómica
        # Usar findOneAndUpdate para obtener la reserva y actualizar en un solo paso
        resultado = db_client.reservas.find_one_and_update(
            {"_id": reserva_id_obj, "usuario": user_id},
            {"$addToSet": {"confirmaciones": user_id}},  # Añade solo si no existe
            return_document=True  # Retorna el documento actualizado
        )
        
        if not resultado:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
        # 2. Obtener información de la reserva para el slot
        cancha = resultado["cancha"]
        fecha = resultado["fecha"]
        hora_inicio = resultado["hora_inicio"]
        estado = resultado["estado"]
        
        # 3. Contar confirmaciones usando agregación (más eficiente? chequeado? u.u)
        pipeline = [
            {"$match": {
                "cancha": cancha,
                "fecha": fecha,
                "hora_inicio": hora_inicio,
                "estado": estado
            }},
            {"$unwind": {"path": "$confirmaciones", "preserveNullAndEmptyArrays": False}},
            {"$group": {"_id": None, "total_confirmaciones": {"$addToSet": "$confirmaciones"}}},
            {"$project": {"count": {"$size": "$total_confirmaciones"}}}
        ]
        
        resultado_conteo = list(db_client.reservas.aggregate(pipeline))
        total_confirmaciones = resultado_conteo[0]["count"] if resultado_conteo else 0
        
        # 4. Si hay al menos 2 confirmaciones, actualizar todas las reservas del slot
        if total_confirmaciones >= 2:
            db_client.reservas.update_many(
                {
                    "cancha": cancha,
                    "fecha": fecha,
                    "hora_inicio": hora_inicio,
                    "estado": estado
                },
                {"$set": {"estado": estado_confirmada["_id"]}}
            )
            return {"msg": "Asistencia confirmada. La reserva ha sido confirmada con éxito."}
        else:
            return {"msg": "Asistencia registrada. Se necesita al menos una confirmación más para confirmar la reserva."}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al confirmar asistencia: {str(e)}")

@router.get("/jugadores/{reserva_id}")
async def get_jugadores_reserva(reserva_id: str, user: dict = Depends(current_user)):
    """Obtiene los jugadores que participaron en una reserva específica"""
    try:
        user_id = ObjectId(user["id"])
        reserva_id_obj = ObjectId(reserva_id)
        
        # Buscar la reserva original
        reserva = db_client.reservas.find_one({"_id": reserva_id_obj})
        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
        # Buscar todas las reservas en la misma cancha, fecha y horario con estado confirmado
        estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
        if not estado_confirmada:
            raise HTTPException(status_code=500, detail="Estado 'Confirmada' no encontrado")
        
        reservas_mismo_slot = list(db_client.reservas.find({
            "cancha": reserva["cancha"],
            "fecha": reserva["fecha"],
            "hora_inicio": reserva["hora_inicio"],
            "estado": estado_confirmada["_id"]
        }))
        
        # Obtener los IDs de todos los usuarios que jugaron
        jugadores_ids = [r["usuario"] for r in reservas_mismo_slot]
        
        # Eliminar duplicados y al usuario actual
        jugadores_ids = [id for id in set(jugadores_ids) if id != user_id]
        
        if not jugadores_ids:
            return []
        
        # Obtener datos de los jugadores
        jugadores = list(db_client.users.find({"_id": {"$in": jugadores_ids}}))
        
        # Verificar reseñas
        for jugador in jugadores:
            reseña = db_client.reseñas.find_one({
                "de": user_id,
                "con": jugador["_id"]
            })
            jugador["calificado"] = reseña is not None
        
        # Limpiar documentos para JSON
        jugadores_limpios = []
        for jugador in jugadores:
            jugadores_limpios.append({
                "_id": str(jugador["_id"]),
                "nombre": jugador.get("nombre", ""),
                "apellido": jugador.get("apellido", ""),
                "username": jugador.get("username", ""),
                "calificado": jugador.get("calificado", False)
            })
        
        return jugadores_limpios
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener jugadores: {str(e)}")
