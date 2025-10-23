from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from routers.defs import *
from db.models.user import User, UserDB
from db.client import db_client
from datetime import datetime
from pydantic import BaseModel, Field
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
from services.matcheo import a_notificar, optimize_weights
from services.email import notificar_posible_matcheo
from pymongo.errors import DuplicateKeyError
import os
from collections import OrderedDict  

class ReservaUsuario(BaseModel):
    id: str
    confirmado: bool = False

class Reserva(BaseModel):
    cancha: str
    horario: str
    fecha: str
    usuarios: List[ReservaUsuario] = Field(default_factory=list)

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

def tiene_conflicto_slot(user_oid, fecha, horario_id):
    est_res = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    if not est_res:
        raise ValueError("Falta estado 'Reservada' en estadoreserva")
    return db_client.reservas.find_one({
        "fecha": fecha,
        "hora_inicio": horario_id,
        "estado": est_res["_id"],
        "usuarios.id": user_oid
    }) is not None

def match_preferencia(user_oid, fecha, horario_id, cancha_id):
    import os
    # Permitir desactivar el filtro de preferencias con un flag de entorno
    if os.getenv("ENFORCE_PREFS_NOTIF", "false").lower() != "true":
        return True
    try:
        dia_nombre = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][datetime.strptime(fecha, "%d-%m-%Y").weekday()]
        dia_doc = db_client.dias.find_one({"nombre": dia_nombre})
        dia_id = dia_doc["_id"] if dia_doc else None
        query = {
            "usuario_id": user_oid,
            "horarios": {"$in": [horario_id]},
            "canchas": {"$in": [cancha_id]}
        }
        if dia_id:
            query["dias"] = {"$in": [dia_id]}
        return db_client.preferencias.find_one(query) is not None
    except:
        return True  # en caso de error, no bloquear

def enviar_notificaciones_slot(reserva_doc, origen_user_id, hora_str, cancha_nombre):
    from services.notifs import (
        should_notify_slot_by_logs, get_notified_users, log_notifications,
        max_candidates_for_slot, user_can_receive, NOTIFY_MIN_S, NOTIFY_MIN_A
    )
    from services.matcheo import a_notificar, S, A
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")

    # 0) ¿Este slot puede notificar ahora? (conteos + cooldown por slot)
    if not should_notify_slot_by_logs(reserva_doc, argentina_tz):
        return

    # 1) Límite dinámico por slot según lugares faltantes
    limite_slot = max_candidates_for_slot(reserva_doc)
    if limite_slot <= 0:
        return

    cancha_id = reserva_doc["cancha"]
    horario_id = reserva_doc["hora_inicio"]
    fecha_str = reserva_doc["fecha"]
    reserva_id = reserva_doc["_id"]

    origen_oid = ObjectId(origen_user_id)

    # 2) Ranking inicial (TOP + random), ya dedupe por usuario
    candidatos = a_notificar(origen_user_id)

    # 3) Duplicados por reserva (logs), y estado del usuario/email
    ya_notificados = get_notified_users(reserva_id)

    notificados = []
    vistos_usuarios = set()
    vistos_emails = set()
    now_local = datetime.now(argentina_tz)

    # 4) Aplicar filtros y respetar el límite del slot
    for usuario_id in candidatos:
        if len(notificados) >= limite_slot:
            break

        if not ObjectId.is_valid(usuario_id):
            continue
        oid = ObjectId(usuario_id)
        if oid == origen_oid or oid in vistos_usuarios or oid in ya_notificados:
            continue

        # cooldown y cuota por usuario
        if not user_can_receive(oid, now_local):
            continue

        # conflicto con el mismo slot
        if tiene_conflicto_slot(oid, fecha_str, horario_id):
            continue

        # usuario habilitado + email
        u = db_client.users.find_one({"_id": oid, "habilitado": True})
        if not u:
            continue
        email = u.get("email")
        if not email or email in vistos_emails:
            continue

        # filtro por preferencias si está activo
        if not match_preferencia(oid, fecha_str, horario_id, cancha_id):
            continue

        # umbrales opcionales por similitud/score
        try:
            s_val = S(origen_user_id, usuario_id)
            a_val = A(origen_user_id, usuario_id)
        except Exception:
            s_val, a_val = 0.0, 0.0

        if s_val < NOTIFY_MIN_S:
            continue
        if a_val < NOTIFY_MIN_A:
            continue

        # Enviar email
        ok = notificar_posible_matcheo(
            to=email,
            day=fecha_str,
            hora=hora_str,
            cancha=cancha_nombre
        )
        if ok:
            notificados.append(oid)
            vistos_emails.add(email)
            vistos_usuarios.add(oid)

    if notificados:
        log_notifications(reserva_id, origen_oid, notificados, status="sent")


def build_reserva_doc(fecha: str, estado_id, cancha_id, horario_id, user_id: str, tz):
    from collections import OrderedDict
    from bson import ObjectId
    from datetime import datetime
    return OrderedDict([
        ("fecha", fecha),
        ("estado", estado_id),
        ("cancha", cancha_id),
        ("hora_inicio", horario_id),
        ("fecha_creacion", datetime.now(tz)),
        ("usuarios", [
            OrderedDict([
                ("id", ObjectId(user_id)),
                ("confirmado", False),
                ("fecha_reserva", datetime.now(tz)),
            ])
        ]),
        ("resultado", ""),
    ])

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

        # Verificar que tenemos un ID de usuario válido
        if not user.get("id") or not ObjectId.is_valid(user["id"]):
            raise HTTPException(status_code=400, detail="ID de usuario no válido")

        # Validar si el usuario está habilitado para hacer reservas
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
            if not estado_reservada:
                raise ValueError('No se encontró el estado "Reservada"')
            estado_reservada_id = estado_reservada["_id"]

            estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
            if not estado_confirmada:
                raise ValueError('No se encontró el estado "Confirmada"')
            estado_confirmada_id = estado_confirmada["_id"]

            # --- Máximo 2 reservas activas SOLO en estado 'Reservada' ---
            # (Confirmadas NO cuentan para el límite)
            horarios_map = {
                h["_id"]: h["hora"]
                for h in db_client.horarios.find({}, {"_id": 1, "hora": 1})
            }

            def _parse_dt_local(fecha_str: str, hhmm: str, tz):
                dt = datetime.strptime(f"{fecha_str} {hhmm}", "%d-%m-%Y %H:%M")
                try:
                    return tz.localize(dt)
                except ValueError:
                    return tz.localize(dt, is_dst=None)

            # Traer solo reservas 'Reservada' donde el usuario está con confirmado == False
            docs_user = list(db_client.reservas.find(
                {
                    "estado": estado_reservada_id,
                    "usuarios": {
                        "$elemMatch": {
                            "id": ObjectId(user["id"]),
                            "confirmado": False
                        }
                    }
                },
                {"fecha": 1, "hora_inicio": 1, "usuarios.confirmado": 1}
            ))

            reservadas_futuras = 0
            for d in docs_user:
                # si por algún motivo la entrada no tiene hora en el catalogo, la saltamos
                hora = horarios_map.get(d["hora_inicio"])
                if not hora:
                    continue
                hora_inicio = hora.split("-")[0].strip()
                dt_inicio = _parse_dt_local(d["fecha"], hora_inicio, argentina_tz)
                if dt_inicio >= ahora_dt:  # cuenta sólo si todavía no empezó
                    reservadas_futuras += 1

            if reservadas_futuras >= 2:
                raise ValueError("No puedes tener más de 2 reservas activas (pendientes).")

            # --- Buscar si existe una reserva 'padre' para este slot en esta cancha (Reservada o Confirmada) ---
            reserva_existente = db_client.reservas.find_one({
                "cancha": cancha_id,
                "fecha": reserva.fecha,
                "hora_inicio": horario_id,
                "estado": {"$in": [estado_reservada_id, estado_confirmada_id]}
            })

            if reserva_existente:
                # Verificar cupo
                if len(reserva_existente.get("usuarios", [])) >= 6:
                    raise ValueError("No hay cupo disponible para esta cancha en ese horario")

                # Agregar usuario si NO está ya en la lista (filtro anti-duplicado)
                result = db_client.reservas.update_one(
                    {
                        "_id": reserva_existente["_id"],
                        "usuarios.id": {"$ne": ObjectId(user["id"])}
                    },
                    {
                        "$push": {"usuarios": {
                            "id": ObjectId(user["id"]),
                            "confirmado": False,
                            "fecha_reserva": datetime.now(argentina_tz)
                        }}
                    }
                )
                if result.modified_count == 0:
                    # Ya estaba en la reserva o no cumplió filtro
                    raise ValueError("Ya tenés una reserva en ese horario y fecha")

                # Refrescar doc
                reserva_existente = db_client.reservas.find_one({"_id": reserva_existente["_id"]})

                # Programar recordatorio (por reserva)
                try:
                    from services.scheduler import programar_recordatorio_nueva_reserva
                    hora_inicio_str = reserva.horario.split('-')[0]
                    programar_recordatorio_nueva_reserva(
                        str(reserva_existente["_id"]),
                        reserva.fecha,
                        hora_inicio_str
                    )
                except Exception as e:
                    print(f"Error programando recordatorio: {e}")

                # Centralizado: notificaciones de matcheo
                hora_inicio_str = reserva.horario.split('-')[0]
                enviar_notificaciones_slot(
                    reserva_existente,
                    user["id"],
                    hora_inicio_str,
                    reserva.cancha
                )
                return reserva_existente
            else:
                # Crear nueva reserva padre (upsert por slot en esta cancha, sin filtrar por estado)
                try:
                    result = db_client.reservas.update_one(
                        {
                            "cancha": cancha_id,
                            "fecha": reserva.fecha,
                            "hora_inicio": horario_id
                        },
                        {
                            "$setOnInsert": build_reserva_doc(
                                fecha=reserva.fecha,
                                estado_id=estado_reservada_id,
                                cancha_id=cancha_id,
                                horario_id=horario_id,
                                user_id=user["id"],
                                tz=argentina_tz
                            )
                        },
                        upsert=True
                    )
                except DuplicateKeyError:
                    raise ValueError("Ya tenés una reserva activa en ese horario y fecha.")

                if result.upserted_id:
                    nueva_reserva = build_reserva_doc(
                        fecha=reserva.fecha,
                        estado_id=estado_reservada_id,
                        cancha_id=cancha_id,
                        horario_id=horario_id,
                        user_id=user["id"],
                        tz=argentina_tz
                    )
                    nueva_reserva["_id"] = result.upserted_id
                else:
                    nueva_reserva = db_client.reservas.find_one({
                        "cancha": cancha_id,
                        "fecha": reserva.fecha,
                        "hora_inicio": horario_id
                    })
                    db_client.reservas.update_one(
                        {
                            "_id": nueva_reserva["_id"],
                            "usuarios.id": {"$ne": ObjectId(user["id"])}
                        },
                        {
                            "$push": {"usuarios": {
                                "id": ObjectId(user["id"]),
                                "confirmado": False,
                                "fecha_reserva": datetime.now(argentina_tz)
                            }}
                        }
                    )
                    # ⚠️ ACÁ FALTABA REFRESCAR
                    nueva_reserva = db_client.reservas.find_one({"_id": nueva_reserva["_id"]})
                # Centralizado: notificaciones de matcheo
                hora_inicio_str = reserva.horario.split('-')[0]
                enviar_notificaciones_slot(
                    nueva_reserva,
                    user["id"],
                    hora_inicio_str,
                    reserva.cancha
                )
                return nueva_reserva

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
            "resultado": 1,  # <-- agrega esto
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
                "estado": r["estado"],
                "resultado": r.get("resultado")  # <-- agrega esto
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
            
            # Si no hay usuarios o la reserva está vacía, eliminarla completamente
            if not reserva_actualizada or len(reserva_actualizada.get("usuarios", [])) == 0:
                # === ELIMINACIÓN EN CASCADA ===
                
                # 1. Eliminar notif_logs asociados a esta reserva
                result_notifs = await asyncio.to_thread(
                    lambda: db_client.notif_logs.delete_many({"reserva": reserva_oid})
                )
                print(f"🗑️ Notif_logs eliminados: {result_notifs.deleted_count}")
                
                # 2. Eliminar la reserva
                await asyncio.to_thread(
                    lambda: db_client.reservas.delete_one({"_id": reserva_oid})
                )
                
                # 3. Cancelar recordatorio
                try:
                    from services.scheduler import cancelar_recordatorio_reserva
                    cancelar_recordatorio_reserva(str(reserva_id))
                except Exception as e:
                    print(f"Error cancelando recordatorio: {e}")
        else:
            # Si es admin, cancelar toda la reserva
            
            # === ELIMINACIÓN EN CASCADA ===
            
            # 1. Eliminar notif_logs asociados a esta reserva
            result_notifs = await asyncio.to_thread(
                lambda: db_client.notif_logs.delete_many({"reserva": reserva_oid})
            )
            print(f"🗑️ Notif_logs eliminados (admin): {result_notifs.deleted_count}")
            
            # 2. Eliminar la reserva
            await asyncio.to_thread(
                lambda: db_client.reservas.delete_one({"_id": reserva_oid})
            )
            
            # 3. Cancelar recordatorio
            try:
                from services.scheduler import cancelar_recordatorio_reserva
                cancelar_recordatorio_reserva(str(reserva_id))
            except Exception as e:
                print(f"Error cancelando recordatorio: {e}")
        
        # Cancelar recordatorio para este usuario (si no se eliminó toda la reserva)
        if not es_admin:
            try:
                from services.scheduler import cancelar_recordatorio_usuario
                await asyncio.to_thread(
                    lambda: cancelar_recordatorio_usuario(str(reserva_id), user_id)
                )
            except Exception as e:
                print(f"Error cancelando recordatorio de usuario: {e}")
        
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


def cerrar_reservas_vencidas():
    """
    Fast path:
      - Escanea solo reservas RESERVADAS con fecha <= hoy
      - No usa $lookup (precarga horarios en memoria)
      - Trae solo campos necesarios
      - Hace 2 update_many
    """
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    ahora = datetime.now(argentina_tz)
    hoy_str = ahora.strftime("%d-%m-%Y")

    # Estados
    est_res  = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    est_canc = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
    if not (est_res and est_conf and est_canc):
        print("❌ Faltan estados en estadoreserva")
        return 0

    # Precargar horarios (id -> "HH:MM-HH:MM")
    horarios_map = {
        h["_id"]: h["hora"]
        for h in db_client.horarios.find({}, {"_id": 1, "hora": 1})
    }

    # Traer SOLO lo necesario y SOLO hasta hoy
    cursor = db_client.reservas.find(
        {"estado": est_res["_id"], "fecha": {"$lte": hoy_str}},
        {"_id": 1, "fecha": 1, "hora_inicio": 1, "usuarios.confirmado": 1}
    )

    to_cancel, to_confirm = [], []

    for r in cursor:
        hora_str = horarios_map.get(r["hora_inicio"])
        if not hora_str:
            continue
        # fin del slot
        try:
            hora_fin = hora_str.split("-")[1].strip()  # "09:00-10:30" -> "10:30"
            fin_naive = datetime.strptime(f"{r['fecha']} {hora_fin}", "%d-%m-%Y %H:%M")
            fin = argentina_tz.localize(fin_naive)
        except Exception as e:
            print(f"❌ Error parseando horario para {r.get('_id')}: {e}")
            continue

        # si todavía no terminó, skip
        if fin > ahora:
            continue

        # contar confirmados (solo trajimos usuarios.confirmado)
        confirmados = 0
        for u in r.get("usuarios", []):
            if u.get("confirmado", False):
                confirmados += 1

        if confirmados >= 2:
            to_confirm.append(r["_id"])
        else:
            to_cancel.append(r["_id"])

    # Updates en lote
    if to_cancel:
        res1 = db_client.reservas.update_many(
            {"_id": {"$in": to_cancel}},
            {"$set": {"estado": est_canc["_id"]}}
        )
        print(f"🗑️ Canceladas: {res1.modified_count}")

    if to_confirm:
        res2 = db_client.reservas.update_many(
            {"_id": {"$in": to_confirm}},
            {"$set": {"estado": est_conf["_id"]}}
        )
        print(f"✅ Confirmadas al cerrar: {res2.modified_count}")

    # (opcional) optimización de pesos
    try:
        if os.getenv("OPTIMIZE_INSIDE_CLOSE", "false").lower() == "true":
            optimize_weights()
            print("🎯 optimize_weights() ejecutado sobre reservas Confirmadas")
    except Exception as e:
        print(f"❌ Error en optimize_weights: {e}")

    return len(to_cancel) + len(to_confirm)

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
        reserva = await asyncio.to_thread(lambda: db_client.reservas.find_one(filtro))
        if not reserva:
            return {
                "usuarios": [],
                "cancha": cancha,
                "horario": horario,
                "fecha": fecha,
                "cantidad": 0,
                "estado_cancelada": str(estado_cancelada["_id"])
            }

        # === NUEVO: precargar calificados por el viewer ===
        viewer_oid = None
        if usuario_id and ObjectId.is_valid(usuario_id):
            viewer_oid = ObjectId(usuario_id)
        calificados_set = set()
        if viewer_oid:
            reseñas = list(db_client.resenias.find(
                {"i": viewer_oid, "reserva": reserva["_id"]},
                {"j": 1}
            ))
            calificados_set = {str(r["j"]) for r in reseñas}

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
                "estado": str(reserva["estado"]),
                "calificado": (viewer_oid is not None and str(usuario["_id"]) in calificados_set)
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
        
        # Obtener estado confirmado de la reserva
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

def es_empleado(user_id: str) -> bool:
    try:
        return db_client.empleados.find_one({"user": ObjectId(user_id)}) is not None
    except Exception:
        return False

@router.get("/listar")
async def listar_reservas_por_fecha(
    fecha: str = Query(..., description="Fecha en formato DD-MM-YYYY"),
    user: dict = Depends(current_user)
) -> List[Dict]:
    """
    Devuelve reservas Confirmadas para una fecha dada, con:
    - _id (str)
    - cancha (nombre)
    - horario ("HH:MM-HH:MM")
    - usuario_nombre (nombres y apellidos unidos por coma)
    - estado (lowercase: 'confirmada')
    - resultado (si existe)
    """

    # 🔐 Solo empleados (si querés abrirlo a todos, comenta este bloque)
    if not es_empleado(user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo empleados pueden listar reservas"
        )

    # 🗓️ Validar fecha
    try:
        datetime.strptime(fecha, "%d-%m-%Y")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use DD-MM-YYYY.")

    # 🔎 Obtener ID del estado 'Confirmada'
    estado_confirmada = await asyncio.to_thread(
        lambda: db_client.estadoreserva.find_one({"nombre": "Confirmada"}, {"_id": 1})
    )
    if not estado_confirmada:
        raise HTTPException(status_code=500, detail="Estado 'Confirmada' no encontrado en la base de datos")

    estado_id = estado_confirmada["_id"]

    # 🧮 Pipeline para traer datos normalizados
    pipeline = [
        {"$match": {
            "fecha": fecha,
            "estado": estado_id
        }},
        # canchas
        {"$lookup": {
            "from": "canchas",
            "localField": "cancha",
            "foreignField": "_id",
            "as": "cancha_info"
        }},
        {"$unwind": "$cancha_info"},
        # horarios
        {"$lookup": {
            "from": "horarios",
            "localField": "hora_inicio",
            "foreignField": "_id",
            "as": "horario_info"
        }},
        {"$unwind": "$horario_info"},
        # users (los jugadores)
        {"$lookup": {
            "from": "users",
            "localField": "usuarios.id",
            "foreignField": "_id",
            "as": "usuarios_info"
        }},
        # proyectar lo que necesitamos (más resultado si existe)
        {"$project": {
            "_id": 1,
            "fecha": 1,
            "resultado": 1,
            "cancha": "$cancha_info.nombre",
            "horario": "$horario_info.hora",
            "usuarios_info": {
                "$map": {
                    "input": "$usuarios_info",
                    "as": "u",
                    "in": {
                        "nombre": {"$ifNull": ["$$u.nombre", ""]},
                        "apellido": {"$ifNull": ["$$u.apellido", ""]}
                    }
                }
            }
        }},
        {"$sort": {"horario": 1, "_id": 1}}
    ]

    docs = await asyncio.to_thread(lambda: list(db_client.reservas.aggregate(pipeline)))

    # 🧹 Formatear salida para el frontend
    salida: List[Dict] = []
    for d in docs:
        nombres = []
        for u in d.get("usuarios_info", []):
            nom = (u.get("nombre") or "").strip()
            ape = (u.get("apellido") or "").strip()
            full = f"{nom} {ape}".strip()
            if full:
                nombres.append(full)
        usuario_nombre = ", ".join(nombres) if nombres else ""

        salida.append({
            "_id": str(d["_id"]),
            "cancha": d.get("cancha", ""),
            "horario": d.get("horario", ""),
            "usuario_nombre": usuario_nombre,
            "estado": "confirmada",  
            "resultado": d.get("resultado", "")
        })

    return salida
