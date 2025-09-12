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
from fastapi import Query
from datetime import datetime, timedelta
from services.matcheo import a_notificar
from services.email import notificar_posible_matcheo
from pymongo.errors import DuplicateKeyError

class ReservaUsuario(BaseModel):
    id: str
    confirmado: bool = False

class Reserva(BaseModel):
    cancha: str
    horario: str
    fecha: str
    usuarios: List[ReservaUsuario] = []

router = APIRouter(prefix="/reservas",
                   tags=["reservas"],
                   responses={404: {"message": "No encontrado"}})


def get_estado_ids_activos():
    """Devuelve los _id de estados que cuentan como 'activos' para bloquear doble reserva de mismo slot."""
    est_res = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if not est_res or not est_conf:
        raise ValueError("Faltan estados 'Reservada' o 'Confirmada' en estadoreserva")
    return est_res["_id"], est_conf["_id"]

def clean_mongo_doc(doc):
    """Convierte todos los ObjectId a string, incluyendo en estructuras anidadas"""
    if isinstance(doc, dict):
        # Crear una copia para evitar modificar el diccionario mientras se itera
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, list):
                result[key] = [clean_mongo_doc(item) for item in value]
            elif isinstance(value, dict):
                result[key] = clean_mongo_doc(value)
            else:
                result[key] = value
        return result
    elif isinstance(doc, list):
        return [clean_mongo_doc(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
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
            raise ValueError("La fecha de reserva debe ser entre hoy y los próximos 6 días.")

        # --- Validación de horarios pasados (solo para el día de hoy) ---
        if fecha_reserva_dt == hoy_dt:
            hora_inicio_str = reserva.horario.split('-')[0]
            hora_reserva_dt = ahora_dt.replace(
                hour=int(hora_inicio_str.split(':')[0]),
                minute=int(hora_inicio_str.split(':')[1]),
                second=0,
                microsecond=0
            )
            if (hora_reserva_dt - ahora_dt) < timedelta(hours=1):
                raise ValueError("No puedes reservar en un horario que ya pasó o con menos de 1 hora de antelación.")

        # Verificar usuario
        if not user.get("id") or not ObjectId.is_valid(user["id"]):
            raise HTTPException(status_code=400, detail="ID de usuario no válido")
        if user.get("habilitado") is not True:
            raise HTTPException(status_code=403, detail="Usuario no habilitado para hacer reservas")

        def operaciones_sincronas():
            # --- IDs de horario y cancha ---
            horario_doc = db_client.horarios.find_one({"hora": reserva.horario})
            if not horario_doc:
                raise ValueError("Horario inválido")
            horario_id = horario_doc["_id"]

            cancha_doc = db_client.canchas.find_one({"nombre": reserva.cancha})
            if not cancha_doc:
                raise ValueError("Cancha inválida")
            cancha_id = cancha_doc["_id"]

            # --- Estados ---
            estado_reservada = db_client.estadoreserva.find_one({"nombre": "Reservada"})
            estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
            estado_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
            if not estado_reservada or not estado_confirmada:
                raise ValueError("Faltan estados 'Reservada' o 'Confirmada' en estadoreserva")

            estado_reservada_id = estado_reservada["_id"]
            estado_confirmada_id = estado_confirmada["_id"]
            estado_cancelada_id = estado_cancelada["_id"] if estado_cancelada else None

            # --- Máximo 2 reservas activas por usuario ---
            reservas_activas = db_client.reservas.count_documents({
                "usuarios.id": ObjectId(user["id"]),
                "estado": {"$in": [estado_reservada_id, estado_confirmada_id]}
            })
            if reservas_activas >= 2:
                raise ValueError("No puedes tener más de 2 reservas activas.")

            # --- Bloqueo mismo día+horario para el mismo usuario (en cualquier cancha) ---
            conflicto_mismo_slot = db_client.reservas.find_one({
                "fecha": reserva.fecha,
                "hora_inicio": horario_id,
                "estado": {"$in": [estado_reservada_id, estado_confirmada_id]},
                "usuarios.id": ObjectId(user["id"])
            })
            if conflicto_mismo_slot:
                raise ValueError("Ya tenés una reserva activa en ese horario y fecha (aunque sea en otra cancha).")

            # === NUEVO: buscar SIEMPRE la reserva padre del slot, sin importar si está Reservada o Confirmada ===
            filtro_slot = {
                "cancha": cancha_id,
                "fecha": reserva.fecha,
                "hora_inicio": horario_id,
            }
            if estado_cancelada_id:
                filtro_slot["estado"] = {"$ne": estado_cancelada_id}

            reserva_padre = db_client.reservas.find_one(filtro_slot)

            # función para agregar usuario con anti-duplicado y control de cupo
            def agregar_usuario_a_reserva(res_doc_id: ObjectId):
                # Control de cupo con doc fresco
                doc = db_client.reservas.find_one({"_id": res_doc_id})
                if len(doc.get("usuarios", [])) >= 6:
                    raise ValueError("No hay cupo disponible para esta cancha en ese horario")

                result = db_client.reservas.update_one(
                    {"_id": res_doc_id, "usuarios.id": {"$ne": ObjectId(user["id"])}},
                    {"$push": {"usuarios": {
                        "id": ObjectId(user["id"]),
                        "confirmado": False,
                        "fecha_reserva": datetime.now(argentina_tz)
                    }}}
                )
                if result.modified_count == 0:
                    raise ValueError("Ya tenés una reserva en ese horario y fecha")
                return db_client.reservas.find_one({"_id": res_doc_id})

            if reserva_padre:
                # Ya existe el slot (reservada o confirmada): agrego usuario
                reserva_padre = agregar_usuario_a_reserva(reserva_padre["_id"])
            else:
                # Crear nueva reserva padre. Si hay condición de carrera/índice único, re-leo y agrego
                try:
                    insert_doc = {
                        "cancha": cancha_id,
                        "fecha": reserva.fecha,
                        "hora_inicio": horario_id,
                        "estado": estado_reservada_id,  # se confirmará luego con >=2 confirmaciones
                        "usuarios": [{
                            "id": ObjectId(user["id"]),
                            "confirmado": False,
                            "fecha_reserva": datetime.now(argentina_tz)
                        }],
                        "notificaciones": [],
                        "fecha_creacion": datetime.now(argentina_tz)
                    }
                    resultado_insert = db_client.reservas.insert_one(insert_doc)
                    reserva_padre = db_client.reservas.find_one({"_id": resultado_insert.inserted_id})
                except DuplicateKeyError:
                    # Otro proceso creó el slot (o ya había uno Confirmado): re-leo y agrego
                    reserva_padre = db_client.reservas.find_one(filtro_slot)
                    if not reserva_padre:
                        # fallback: leer sin filtro de estado por si 'Cancelada' interfiere
                        reserva_padre = db_client.reservas.find_one({
                            "cancha": cancha_id, "fecha": reserva.fecha, "hora_inicio": horario_id
                        })
                    if not reserva_padre:
                        raise ValueError("No se pudo crear ni encontrar la reserva del slot, reintente.")
                    reserva_padre = agregar_usuario_a_reserva(reserva_padre["_id"])

            # --- Notificaciones (nuevo modelo con notificados_globales) ---
            try:
                # Ensure field exists
                db_client.reservas.update_one(
                    {"_id": reserva_padre["_id"], "notificados_globales": {"$exists": False}},
                    {"$set": {"notificados_globales": []}}
                )

                usuarios_a_notificar = a_notificar(user["id"])
                doc = db_client.reservas.find_one({"_id": reserva_padre["_id"]}, {"notificados_globales": 1})
                ya_notificados = set(str(x) for x in doc.get("notificados_globales", []))

                destinatarios_ok = []
                for usuario_id in usuarios_a_notificar:
                    if not ObjectId.is_valid(usuario_id):
                        continue
                    if usuario_id in ya_notificados:
                        continue

                    usuario_notificado = db_client.users.find_one({"_id": ObjectId(usuario_id)})
                    if not usuario_notificado or not usuario_notificado.get("email"):
                        continue

                    ok = notificar_posible_matcheo(
                        to=usuario_notificado["email"],
                        day=reserva.fecha,
                        hora=reserva.horario,
                        cancha=reserva.cancha
                    )
                    if ok:
                        destinatarios_ok.append(ObjectId(usuario_id))

                if destinatarios_ok:
                    db_client.reservas.update_one(
                        {"_id": reserva_padre["_id"]},
                        {
                            "$push": {"notificaciones": {
                                "usuario_origen": ObjectId(user["id"]),
                                "usuarios_notificados": destinatarios_ok,
                                "fecha": datetime.now(argentina_tz)
                            }},
                            "$addToSet": {"notificados_globales": {"$each": destinatarios_ok}}
                        }
                    )
            except Exception as e:
                print(f"Error enviando/registrando notificaciones: {e}")

            # --- Recordatorio (igual que tu código actual) ---
            try:
                from services.scheduler import programar_recordatorio_usuario
                hora_inicio_str = reserva.horario.split('-')[0]
                programar_recordatorio_usuario(
                    str(reserva_padre["_id"]),
                    user["id"],
                    reserva.fecha,
                    hora_inicio_str
                )
            except Exception as e:
                print(f"Error programando recordatorio: {e}")

            return reserva_padre

        resultado = await asyncio.to_thread(operaciones_sincronas)
        return {"msg": "Reserva guardada", "reserva": clean_mongo_doc(resultado)}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar la reserva: {str(e)}")



@router.get("/mis-reservas")
async def get_mis_reservas(
    estados: Optional[str] = Query(default="Reservada,Confirmada"),   # puedes poner Reservada,Confirmada,Completada,Cancelada
    incluir_pasadas: bool = Query(default=False),
    user: dict = Depends(current_user)
):
    user_id = ObjectId(user["id"])

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    ahora = datetime.now(argentina_tz)

    # Obtener IDs de estados solicitados
    estados_list = [s.strip() for s in estados.split(",") if s.strip()]
    estados_docs = await asyncio.to_thread(
        lambda: list(db_client.estadoreserva.find({"nombre": {"$in": estados_list}}, {"_id": 1, "nombre": 1}))
    )
    if not estados_docs:
        raise HTTPException(status_code=400, detail="Parámetro 'estados' inválido")

    estado_ids = [d["_id"] for d in estados_docs]

    # Pipeline base
    pipeline = [
        {"$match": {
            "usuarios.id": user_id,
            "estado": {"$in": estado_ids}
        }},
        {"$lookup": {"from": "canchas", "localField": "cancha", "foreignField": "_id", "as": "cancha_info"}},
        {"$unwind": "$cancha_info"},
        {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
        {"$unwind": "$horario_info"},
        {"$lookup": {"from": "estadoreserva", "localField": "estado", "foreignField": "_id", "as": "estado_info"}},
        {"$unwind": "$estado_info"},
        {"$project": {
            "_id": 1,
            "fecha": 1,
            "cancha": "$cancha_info.nombre",
            "horario": "$horario_info.hora",
            "usuarios": 1,
            "estado": "$estado_info.nombre"
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

        if incluir_pasadas or (reserva_dt >= ahora):
            # Verificar si el usuario ya confirmó asistencia
            confirmado = False
            for usuario in r.get("usuarios", []):
                if str(usuario.get("id")) == user["id"] and usuario.get("confirmado", False):
                    confirmado = True
                    break

            r_limpia = {
                "_id": str(r["_id"]),
                "fecha": r["fecha"],
                "cancha": r["cancha"],
                "horario": r["horario"],
                "asistenciaConfirmada": confirmado,
                "cantidad_usuarios": len(r.get("usuarios", [])),
                "estado": r["estado"],  # <-- ahora llega el nombre del estado
            }

            reservas_list.append(r_limpia)

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
    
    user_oid = ObjectId(user_id)

    # Verificar si el usuario es admin
    user_db_data = await asyncio.to_thread(
        lambda: db_client.users.find_one({"_id": user_oid})
    )
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    admin_data = await asyncio.to_thread(
        lambda: db_client.admins.find_one({"user": user_db_data["_id"]})
    )
    es_admin = bool(admin_data)

    # Obtener la reserva
    reserva = await asyncio.to_thread(
        lambda: db_client.reservas.find_one({"_id": reserva_oid})
    )
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Verificar que el usuario esté en la reserva (a menos que sea admin)
    usuario_en_reserva = False
    for usuario in reserva.get("usuarios", []):
        if str(usuario.get("id")) == user_id:
            usuario_en_reserva = True
            break

    if not usuario_en_reserva and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta reserva")

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
        # Cancelar solo la participación del usuario en la reserva
        if not es_admin:
            # Eliminar al usuario de la lista de usuarios
            result = await asyncio.to_thread(
                lambda: db_client.reservas.update_one(
                    {"_id": reserva_oid},
                    {"$pull": {"usuarios": {"id": user_oid}}}
                )
            )
            
            # Si no quedan usuarios, eliminar la reserva
            reserva_actualizada = await asyncio.to_thread(
                lambda: db_client.reservas.find_one({"_id": reserva_oid})
            )
            
            if not reserva_actualizada.get("usuarios"):
                await asyncio.to_thread(
                    lambda: db_client.reservas.delete_one({"_id": reserva_oid})
                )
        else:
            # Si es admin, cancelar toda la reserva
            await asyncio.to_thread(
                lambda: db_client.reservas.delete_one({"_id": reserva_oid})
            )
        
        # Cancelar recordatorio para este usuario
        try:
            from services.scheduler import cancelar_recordatorio_usuario
            await asyncio.to_thread(
                lambda: cancelar_recordatorio_usuario(str(reserva_id), user_id)
            )
        except Exception as e:
            print(f"Error cancelando recordatorio: {e}")
        
        # Notificar a otros usuarios de la reserva
        try:
            from services.email import notificar_cancelacion_reserva
            for usuario_data in reserva.get("usuarios", []):
                # No notificar al usuario que cancela
                if str(usuario_data.get("id")) == user_id:
                    continue
                
                usuario = await asyncio.to_thread(
                    lambda: db_client.users.find_one({"_id": usuario_data.get("id")})
                )
                
                if usuario and usuario.get("email"):
                    cancha_doc = await asyncio.to_thread(
                        lambda: db_client.canchas.find_one({"_id": reserva["cancha"]})
                    )
                    
                    await asyncio.to_thread(
                        notificar_cancelacion_reserva,
                        usuario["email"],
                        reserva["fecha"],
                        horario_doc["hora"],
                        cancha_doc["nombre"],
                        user_db_data["nombre"],
                        user_db_data["apellido"]
                    )
        except Exception as e:
            print(f"Error notificando cancelación a otros usuarios: {e}")
        
        return {"msg": "Reserva cancelada con éxito"}
    else:
        # Si queda menos de 24 horas, se deniega la cancelación.
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar la reserva con menos de 24 horas de antelación."
        )


@router.get("/cantidad")
async def obtener_cantidad_reservas(fecha: str):
    """Obtiene la cantidad de usuarios por cancha y horario para una fecha específica"""
    try:
        # Validar formato de fecha
        datetime.strptime(fecha, "%d-%m-%Y")
        
        # Obtener estado cancelada
        estado_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
        
        # Pipeline para obtener las reservas no canceladas para esta fecha
        pipeline = [
            {"$match": {"fecha": fecha, "estado": {"$ne": estado_cancelada["_id"]}}},
            # Contar usuarios en cada reserva
            {"$project": {
                "cancha": 1,
                "hora_inicio": 1,
                "cantidad_usuarios": {"$size": "$usuarios"}
            }},
            # Traer info de canchas y horarios
            {"$lookup": {
                "from": "canchas",
                "localField": "cancha",
                "foreignField": "_id",
                "as": "cancha_info"
            }},
            {"$unwind": "$cancha_info"},
            {"$lookup": {
                "from": "horarios",
                "localField": "hora_inicio",
                "foreignField": "_id",
                "as": "horario_info"
            }},
            {"$unwind": "$horario_info"},
            # Formatear resultado
            {"$project": {
                "_id": 0,
                "cancha": "$cancha_info.nombre",
                "horario": "$horario_info.hora",
                "cantidad": "$cantidad_usuarios"
            }}
        ]
        
        resultado = await asyncio.to_thread(lambda: list(db_client.reservas.aggregate(pipeline)))
        return JSONResponse(content=resultado)
    
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de fecha inválido. Use DD-MM-YYYY."
        )
    except Exception as e:
        print(f"Error al obtener cantidad de reservas: {str(e)}")
        import traceback
        traceback.print_exc()
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
    estado_completada = db_client.estadoreserva.find_one({"nombre": "Completada"})

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
                
                # Procesar datos para entrenamiento del modelo usando todos los usuarios que reservaron
                if len(reserva.get("usuarios", [])) > 1:
                    print(f"   👥 Procesando interacciones entre {len(reserva['usuarios'])} usuarios")
                    
                    # Todos los usuarios confirmaron al jugar juntos
                    usuarios_ids = [str(u["id"]) for u in reserva["usuarios"]]
                    
                    # Crear pares de usuarios que jugaron juntos
                    for i, usuario_i in enumerate(usuarios_ids):
                        for usuario_j in usuarios_ids[i+1:]:
                            clave = (usuario_i, usuario_j)
                            datos_entrenamiento[clave] = datos_entrenamiento.get(clave, 0) + 1
                            print(f"   ✅ {usuario_i[:8]}... y {usuario_j[:8]}... jugaron juntos -> +1")
                
                # También procesar notificaciones si existen
                for notificacion in reserva.get("notificaciones", []):
                    usuario_origen = str(notificacion.get("usuario_origen"))
                    usuarios_notificados = [str(uid) for uid in notificacion.get("usuarios_notificados", [])]
                    
                    if usuario_origen and usuarios_notificados:
                        print(f"   📣 Usuario {usuario_origen[:8]}... notificó a {len(usuarios_notificados)} usuarios")
                        
                        # Verificar qué usuarios notificados efectivamente reservaron
                        usuarios_reserva = [str(u["id"]) for u in reserva.get("usuarios", [])]
                        
                        for usuario_notificado in usuarios_notificados:
                            clave = (usuario_origen, usuario_notificado)
                            
                            if usuario_notificado in usuarios_reserva:
                                # El usuario notificado sí reservó -> +1
                                datos_entrenamiento[clave] = datos_entrenamiento.get(clave, 0) + 1
                                print(f"   ✅ {usuario_notificado[:8]}... fue notificado y SÍ reservó -> +1")
                            else:
                                # El usuario notificado no reservó -> +0
                                datos_entrenamiento[clave] = datos_entrenamiento.get(clave, 0) + 0
                                print(f"   ❌ {usuario_notificado[:8]}... fue notificado pero NO reservó -> +0")
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
            
@router.get("/detalle")
async def detalle_reserva(cancha: str, horario: str, fecha: str, usuario_id: str = None):
    """Obtiene el detalle de una reserva en un slot específico, incluyendo todos los usuarios"""
    try:
        cancha_doc = db_client.canchas.find_one({"nombre": cancha})
        horario_doc = db_client.horarios.find_one({"hora": horario})
        if not cancha_doc or not horario_doc:
            raise HTTPException(status_code=404, detail="Cancha u horario no encontrados")

        estado_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
        
        # Buscar la reserva padre para este slot
        filtro = {
            "cancha": cancha_doc["_id"],
            "hora_inicio": horario_doc["_id"],
            "fecha": fecha,
            "estado": {"$ne": estado_cancelada["_id"]}
        }
        
        # Con nuestro nuevo modelo, solo hay una reserva por slot, con múltiples usuarios
        reserva = await asyncio.to_thread(lambda: db_client.reservas.find_one(filtro))
        
        if not reserva:
            # No hay reserva en este slot, devolvemos una estructura vacía
            return {
                "usuarios": [],
                "cancha": cancha,
                "horario": horario,
                "fecha": fecha,
                "cantidad": 0,
                "estado_cancelada": str(estado_cancelada["_id"])
            }
        
        # Procesamos los usuarios de la reserva
        usuarios_info = []
        for usuario_data in reserva.get("usuarios", []):
            usuario_id_obj = usuario_data.get("id")
            if not usuario_id_obj:
                continue
                
            usuario = await asyncio.to_thread(lambda: db_client.users.find_one({"_id": usuario_id_obj}))
            if not usuario:
                continue
                
            usuarios_info.append({
                "nombre": usuario.get("nombre", ""),
                "apellido": usuario.get("apellido", ""),
                "reserva_id": str(reserva["_id"]),
                "usuario_id": str(usuario["_id"]),
                "estado": str(reserva["estado"])
            })
        
        return {
            "usuarios": usuarios_info,
            "cancha": cancha,
            "horario": horario,
            "fecha": fecha,
            "cantidad": len(usuarios_info),
            "estado_cancelada": str(estado_cancelada["_id"]),
            "reserva_id": str(reserva["_id"])
        }
    
    except Exception as e:
        print(f"Error al obtener detalles de reserva: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener detalles: {str(e)}")


@router.post("/confirmar/{reserva_id}")
async def confirmar_asistencia(reserva_id: str, user: dict = Depends(current_user)):
    """Confirma la asistencia del usuario a una reserva"""
    
    try:
        # Verificar que la reserva exista
        user_id = ObjectId(user["id"])
        reserva_id_obj = ObjectId(reserva_id)
        
        # Obtener estado confirmado
        estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
        if not estado_confirmada:
            raise HTTPException(status_code=500, detail="Estado 'Confirmada' no encontrado en la base de datos")
            
        # Marcar al usuario como confirmado en la reserva
        resultado = await asyncio.to_thread(
            lambda: db_client.reservas.update_one(
                {
                    "_id": reserva_id_obj, 
                    "usuarios.id": user_id
                },
                {
                    "$set": {"usuarios.$.confirmado": True}
                }
            )
        )
        
        if resultado.modified_count == 0:
            raise HTTPException(status_code=404, detail="Reserva no encontrada o usuario no está en la reserva")
        
        # Contar confirmaciones
        reserva = await asyncio.to_thread(
            lambda: db_client.reservas.find_one({"_id": reserva_id_obj})
        )
        usuarios_confirmados = sum(1 for u in reserva.get("usuarios", []) if u.get("confirmado", False))
        
        # Si hay al menos 2 confirmaciones, actualizar estado de la reserva
        if usuarios_confirmados >= 2:
            await asyncio.to_thread(
                lambda: db_client.reservas.update_one(
                    {"_id": reserva_id_obj},
                    {"$set": {"estado": estado_confirmada["_id"]}}
                )
            )
            return {"msg": "Asistencia confirmada. La reserva ha sido confirmada con éxito."}
        else:
            return {"msg": "Asistencia registrada. Se necesita al menos una confirmación más para confirmar la reserva."}
            
    except Exception as e:
        print(f"Error al confirmar asistencia: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al confirmar asistencia: {str(e)}")
