from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import asyncio
import os
import pytz
import re
from pydantic import BaseModel, Field
from datetime import date

from db.client import db_client
from db.models.reserva import ReservaCreate as Reserva, ReservaUsuarioRef
from db.schemas.reserva import reserva_schema_db

from routers.Security.auth import current_user, verify_csrf, require_perms, require_roles
from services.authz import user_has_any_role
from services.matcheo import a_notificar, optimize_weights
from services.email import notificar_posible_matcheo, notificar_recordatorio, notificar_confirmacion_reserva

from pymongo.errors import DuplicateKeyError
from collections import OrderedDict

router = APIRouter(
    prefix="/reservas",
    tags=["reservas"],
    responses={404: {"message": "No encontrado"}},
)

# ==========================
# Helpers (PERSONAS first!)
# ==========================

def _rx_prefix(s: str):
    """Helper para búsqueda por prefijo case-insensitive"""
    return {"$regex": f"^{re.escape(s)}", "$options": "i"}

def _persona_email_por_user_id(user_oid) -> Optional[str]:
    """
    Devuelve el email de la persona asociada al user_id.
    Acepta str u ObjectId y nunca lanza excepción: devuelve None si no hay email.
    """
    try:
        uid = user_oid if isinstance(user_oid, ObjectId) else ObjectId(str(user_oid))
    except Exception:
        return None

    udoc = db_client.users.find_one({"_id": uid}, {"persona": 1})
    if not udoc or not udoc.get("persona"):
        return None

    pdoc = db_client.personas.find_one({"_id": udoc["persona"]}, {"email": 1})
    email = (pdoc or {}).get("email")
    return email.strip() if isinstance(email, str) else None

def _enviar_cancel_mail(to: str, fecha, hora, cancha: str):
    """
    Wrapper defensivo para enviar email de cancelación.
    Prioriza el template de admin sin links.
    """
    if not (isinstance(to, str) and "@" in to):
        return
    
    try:
        # primero, template especial para admin
        from services.email import notificar_cancelacion_por_admin
        notificar_cancelacion_por_admin(to, fecha, hora, cancha)
        return
    except Exception:
        pass
    
    try:
        # fallback al viejo template general
        from services.email import notificar_cancelacion_reserva
        notificar_cancelacion_reserva(to, fecha, hora, cancha, "Administración", "")
    except Exception as e:
        print(f"[warn] cancel mail: no se pudo enviar → {e}")

# ==========================
# Pydantic Models
# ==========================

class AdminBuscarReservasRequest(BaseModel):
    fecha: str | None = None        # "DD-MM-YYYY" (desde front se convierte)
    cancha: str | None = None       # prefijo
    usuario: str | None = None      # prefijo: username / nombre / apellido
    page: int = 1
    limit: int = 10

class AdminCancelarReservaBody(BaseModel):
    reserva_id: str

class CrearReservaAdminRequest(BaseModel):
    fecha: str = Field(..., description="Fecha en formato DD-MM-YYYY")
    cancha_id: str = Field(..., description="ObjectId de la cancha")
    horario_id: str = Field(..., description="ObjectId del horario")
    usuarios: list[str] = Field(..., min_items=1, max_items=6, description="IDs de usuarios (1-6)")

# ==========================
# Reglas/estados/validaciones
# ==========================

def get_estado_ids_activos():
    """Devuelve los _id de estados que cuentan como 'activos' para bloquear doble reserva de mismo slot."""
    est_res = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if not est_res or not est_conf:
        raise ValueError("Faltan estados 'Reservada' o 'Confirmada' en estadoreserva")
    return est_res["_id"], est_conf["_id"]

def tiene_conflicto_slot(user_oid, fecha, horario_id):
    est_res  = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if not est_res or not est_conf:
        raise ValueError("Faltan estados en estadoreserva")
    return db_client.reservas.find_one({
        "fecha": fecha,
        "hora_inicio": horario_id,
        "estado": {"$in": [est_res["_id"], est_conf["_id"]]},
        "usuarios.id": user_oid
    }) is not None

def match_preferencia(user_oid, fecha, horario_id, cancha_id):
    # Permitir desactivar el filtro de preferencias con un flag de entorno
    if os.getenv("ENFORCE_PREFS_NOTIF", "false").lower() != "true":
        return True
    try:
        dia_nombre = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][
            datetime.strptime(fecha, "%d-%m-%Y").weekday()
        ]
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

# ==========================
# Notificaciones (PERSONAS)
# ==========================

def enviar_notificaciones_slot(reserva_doc, origen_user_id, hora_str, cancha_nombre):
    """Notifica candidatos a matcheo por email (desde PERSONAS)."""
    from services.notifs import ensure_notif_indexes, should_notify_slot_by_logs, get_notified_users, log_notifications
    # Asegura índices para dedupe/velocidad (idempotente)
    ensure_notif_indexes()

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    if not should_notify_slot_by_logs(reserva_doc, argentina_tz):
        return

    cancha_id = reserva_doc["cancha"]
    horario_id = reserva_doc["hora_inicio"]
    fecha_str = reserva_doc["fecha"]
    reserva_id = reserva_doc["_id"]

    origen_oid = ObjectId(origen_user_id)
    candidatos = a_notificar(origen_user_id)
    
    # CAP de seguridad por si a_notificar cambia o falla
    limite = int(os.getenv("USUARIOS_A_RECOMENDAR", "10") or "10")
    candidatos = candidatos[:limite]
    
    # Log de candidatos seleccionados
    print(f"[notif] top+random={candidatos} limite={limite}")
    print(f"[notif] reserva={reserva_id} origen={origen_user_id} candidatos={len(candidatos)} lista={candidatos}")

    ya_notificados = get_notified_users(reserva_id)
    notificados = []
    vistos_usuarios = set()
    vistos_emails = set()

    for usuario_id in candidatos:
        if not ObjectId.is_valid(usuario_id):
            continue
        oid = ObjectId(usuario_id)

        # ya en la reserva o duplicados
        if oid in {u["id"] for u in reserva_doc.get("usuarios", [])}:
            continue
        if oid == origen_oid or oid in vistos_usuarios or oid in ya_notificados:
            continue
        if tiene_conflicto_slot(oid, fecha_str, horario_id):
            continue

        # user habilitado
        u = db_client.users.find_one({"_id": oid, "habilitado": True}, {"persona": 1})
        if not u:
            continue

        # email desde PERSONAS
        p = db_client.personas.find_one({"_id": u.get("persona")}, {"email": 1})
        email = (p or {}).get("email")
        if not email or email in vistos_emails:
            continue

        if not match_preferencia(oid, fecha_str, horario_id, cancha_id):
            continue

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
        print(f"[notif] reserva={reserva_id} notificados_ok={len(notificados)}")

# ==========================
# Construcción de reserva
# ==========================

def build_reserva_doc(fecha: str, estado_id, cancha_id, horario_id, user_id: str, tz):
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

# ==========================
# Endpoints
# ==========================

@router.post("/reservar", dependencies=[Depends(verify_csrf)])
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

        # Verificar user id
        if not user.get("id") or not ObjectId.is_valid(user["id"]):
            raise HTTPException(status_code=400, detail="ID de usuario no válido")

        # Habilitado para reservar
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

            # 🔴 NUEVO: validar que ese horario esté habilitado para esa cancha
            horarios_cancha = cancha_doc.get("horarios") or []
            if not isinstance(horarios_cancha, list) or horario_id not in horarios_cancha:
                raise ValueError("Ese horario no está habilitado para esta cancha")

            # --- Estados ---
            estado_reservada = db_client.estadoreserva.find_one({"nombre": "Reservada"})
            if not estado_reservada:
                raise ValueError('No se encontró el estado "Reservada"')
            estado_reservada_id = estado_reservada["_id"]

            estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
            if not estado_confirmada:
                raise ValueError('No se encontró el estado "Confirmada"')
            estado_confirmada_id = estado_confirmada["_id"]

            # --- Máximo 2 reservas activas SOLO en 'Reservada' ---
            horarios_map = {h["_id"]: h["hora"] for h in db_client.horarios.find({}, {"_id": 1, "hora": 1})}

            def _parse_dt_local(fecha_str: str, hhmm: str, tz):
                dt = datetime.strptime(f"{fecha_str} {hhmm}", "%d-%m-%Y %H:%M")
                try:
                    return tz.localize(dt)
                except ValueError:
                    return tz.localize(dt, is_dst=None)

            docs_user = list(db_client.reservas.find(
                {
                    "estado": estado_reservada_id,
                    "usuarios": {"$elemMatch": {"id": ObjectId(user["id"]), "confirmado": False}}
                },
                {"fecha": 1, "hora_inicio": 1, "usuarios.confirmado": 1}
            ))

            reservadas_futuras = 0
            for d in docs_user:
                hora = horarios_map.get(d["hora_inicio"])
                if not hora:
                    continue
                hora_inicio = hora.split("-")[0].strip()
                dt_inicio = _parse_dt_local(d["fecha"], hora_inicio, argentina_tz)
                if dt_inicio >= ahora_dt:
                    reservadas_futuras += 1

            if reservadas_futuras >= 2:
                raise ValueError("No puedes tener más de 2 reservas activas (pendientes).")

            # --- Reserva padre por slot ---
            reserva_existente = db_client.reservas.find_one({
                "cancha": cancha_id,
                "fecha": reserva.fecha,
                "hora_inicio": horario_id,
                "estado": {"$in": [estado_reservada_id, estado_confirmada_id]}
            })

            if reserva_existente:
                # Cupo
                if len(reserva_existente.get("usuarios", [])) >= 6:
                    raise ValueError("No hay cupo disponible para esta cancha en ese horario")

                # Agregar user si no está
                result = db_client.reservas.update_one(
                    {"_id": reserva_existente["_id"], "usuarios.id": {"$ne": ObjectId(user["id"])}},
                    {"$push": {"usuarios": {
                        "id": ObjectId(user["id"]),
                        "confirmado": False,
                        "fecha_reserva": datetime.now(argentina_tz)
                    }}}
                )
                if result.modified_count == 0:
                    raise ValueError("Ya tenés una reserva en ese horario y fecha")

                reserva_existente = db_client.reservas.find_one({"_id": reserva_existente["_id"]})

                # Recordatorio
                try:
                    from services.scheduler import programar_recordatorio_nueva_reserva
                    hora_inicio_str = reserva.horario.split('-')[0]
                    programar_recordatorio_nueva_reserva(str(reserva_existente["_id"]), reserva.fecha, hora_inicio_str)
                except Exception as e:
                    print(f"Error programando recordatorio: {e}")

                # Notifs
                hora_inicio_str = reserva.horario.split('-')[0]
                enviar_notificaciones_slot(reserva_existente, user["id"], hora_inicio_str, reserva.cancha)
                return reserva_existente

            else:
                # Crear nueva reserva padre (upsert por slot)
                try:
                    result = db_client.reservas.update_one(
                        {"cancha": cancha_id, "fecha": reserva.fecha, "hora_inicio": horario_id},
                        {"$setOnInsert": build_reserva_doc(
                            fecha=reserva.fecha, estado_id=estado_reservada_id,
                            cancha_id=cancha_id, horario_id=horario_id,
                            user_id=user["id"], tz=argentina_tz
                        )},
                        upsert=True
                    )
                except DuplicateKeyError:
                    raise ValueError("Ya tenés una reserva activa en ese horario y fecha.")

                if result.upserted_id:
                    nueva_reserva = build_reserva_doc(
                        fecha=reserva.fecha, estado_id=estado_reservada_id,
                        cancha_id=cancha_id, horario_id=horario_id,
                        user_id=user["id"], tz=argentina_tz
                    )
                    nueva_reserva["_id"] = result.upserted_id
                else:
                    nueva_reserva = db_client.reservas.find_one({
                        "cancha": cancha_id, "fecha": reserva.fecha, "hora_inicio": horario_id
                    })
                    db_client.reservas.update_one(
                        {"_id": nueva_reserva["_id"], "usuarios.id": {"$ne": ObjectId(user["id"])}},
                        {"$push": {"usuarios": {
                            "id": ObjectId(user["id"]),
                            "confirmado": False,
                            "fecha_reserva": datetime.now(argentina_tz)
                        }}}
                    )
                    nueva_reserva = db_client.reservas.find_one({"_id": nueva_reserva["_id"]})

                # Notifs
                hora_inicio_str = reserva.horario.split('-')[0]
                enviar_notificaciones_slot(nueva_reserva, user["id"], hora_inicio_str, reserva.cancha)
                
                # Programar recordatorio 1h antes
                try:
                    from services.scheduler import programar_recordatorio_nueva_reserva
                    hora_inicio_str = reserva.horario.split('-')[0]
                    programar_recordatorio_nueva_reserva(str(nueva_reserva["_id"]), reserva.fecha, hora_inicio_str)
                except Exception as e:
                    print(f"Error programando recordatorio: {e}")
                
                return nueva_reserva

        resultado = await asyncio.to_thread(operaciones_sincronas)
        
        # --- CONFIRMACIÓN AL QUE RESERVA ---
        try:
            mi_mail = _persona_email_por_user_id(user["id"])
            if mi_mail:
                # Enviar confirmación inmediata
                notificar_confirmacion_reserva(mi_mail, reserva.fecha, reserva.horario.split('-')[0], reserva.cancha)
        except Exception as e:
            print(f"Error enviando confirmación: {e}")
        
        return {"msg": "Reserva guardada", "reserva": reserva_schema_db(resultado)}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar la reserva: {str(e)}")

@router.get("/mis-reservas")
async def get_mis_reservas(
    estados: Optional[str] = Query(default="Reservada,Confirmada"),
    incluir_pasadas: bool = Query(default=False),
    user: dict = Depends(current_user),
):
    user_id = ObjectId(user["id"])

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    ahora = datetime.now(argentina_tz)

    # IDs de estados solicitados
    estados_list = [s.strip() for s in estados.split(",") if s.strip()]
    estados_docs = await asyncio.to_thread(
        lambda: list(db_client.estadoreserva.find({"nombre": {"$in": estados_list}}, {"_id": 1, "nombre": 1}))
    )
    if not estados_docs:
        raise HTTPException(status_code=400, detail="Parámetro 'estados' inválido")

    estado_ids = [d["_id"] for d in estados_docs]

    pipeline = [
        {"$match": {"usuarios.id": user_id, "estado": {"$in": estado_ids}}},
        {"$lookup": {"from": "canchas", "localField": "cancha", "foreignField": "_id", "as": "cancha_info"}},
        {"$unwind": "$cancha_info"},
        {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
        {"$unwind": "$horario_info"},
        {"$lookup": {"from": "estadoreserva", "localField": "estado", "foreignField": "_id", "as": "estado_info"}},
        {"$unwind": "$estado_info"},
        {"$project": {
            "_id": 1, "fecha": 1, "resultado": 1,
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
        # datetime de la reserva
        fecha_str = r["fecha"]
        hora_inicio_str = r["horario"].split('-')[0]
        reserva_dt = argentina_tz.localize(datetime.strptime(f"{fecha_str} {hora_inicio_str}", "%d-%m-%Y %H:%M"))

        if incluir_pasadas or (reserva_dt >= ahora):
            # confirmado?
            confirmado = any(
                str(usuario.get("id")) == user["id"] and usuario.get("confirmado", False)
                for usuario in r.get("usuarios", [])
            )

            r_limpia = {
                "_id": str(r["_id"]),
                "fecha": r["fecha"],
                "cancha": r["cancha"],
                "horario": r["horario"],
                "asistenciaConfirmada": confirmado,
                "cantidad_usuarios": len(r.get("usuarios", [])),
                "estado": r["estado"],
                "resultado": r.get("resultado")
            }
            reservas_list.append(r_limpia)

    return reservas_list

@router.delete("/cancelar/{reserva_id}", dependencies=[Depends(verify_csrf)])
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

    # RBAC admin
    es_admin = await asyncio.to_thread(lambda: user_has_any_role(user_oid, "admin"))

    # Obtener reserva
    reserva = await asyncio.to_thread(lambda: db_client.reservas.find_one({"_id": reserva_oid}))
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # El usuario debe estar en la reserva (salvo admin)
    usuario_en_reserva = any(str(u.get("id")) == user_id for u in reserva.get("usuarios", []))
    if not usuario_en_reserva and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta reserva")

    # Obtener horario
    horario_doc = await asyncio.to_thread(lambda: db_client.horarios.find_one({"_id": reserva["hora_inicio"]}))
    hora_inicio_str = horario_doc["hora"].split('-')[0]

    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    reserva_dt = argentina_tz.localize(datetime.strptime(f"{reserva['fecha']} {hora_inicio_str}", "%d-%m-%Y %H:%M"))
    ahora_dt = datetime.now(argentina_tz)

    if (reserva_dt - ahora_dt) >= timedelta(hours=1):
        if not es_admin:
            # Sacar al usuario
            await asyncio.to_thread(lambda: db_client.reservas.update_one(
                {"_id": reserva_oid}, {"$pull": {"usuarios": {"id": user_oid}}}
            ))

            reserva_actualizada = await asyncio.to_thread(lambda: db_client.reservas.find_one({"_id": reserva_oid}))
            if not reserva_actualizada or len(reserva_actualizada.get("usuarios", [])) == 0:
                # Eliminar notif_logs y reserva
                await asyncio.to_thread(lambda: db_client.notif_logs.delete_many({"reserva": reserva_oid}))
                await asyncio.to_thread(lambda: db_client.reservas.delete_one({"_id": reserva_oid}))
                try:
                    from services.scheduler import cancelar_recordatorio_reserva
                    cancelar_recordatorio_reserva(str(reserva_id))
                except Exception as e:
                    print(f"Error cancelando recordatorio: {e}")
        else:
            # Admin: eliminar reserva entera
            await asyncio.to_thread(lambda: db_client.notif_logs.delete_many({"reserva": reserva_oid}))
            await asyncio.to_thread(lambda: db_client.reservas.delete_one({"_id": reserva_oid}))
            try:
                from services.scheduler import cancelar_recordatorio_reserva
                cancelar_recordatorio_reserva(str(reserva_id))
            except Exception as e:
                print(f"Error cancelando recordatorio: {e}")

        # Cancelar recordatorio por usuario (si aplica)
        if not es_admin:
            try:
                from services.scheduler import cancelar_recordatorio_usuario
                await asyncio.to_thread(lambda: cancelar_recordatorio_usuario(str(reserva_id), user_id))
            except Exception as e:
                print(f"Error cancelando recordatorio de usuario: {e}")

        # Notificar a otros usuarios (PERSONAS)
        try:
            from services.email import notificar_cancelacion_reserva

            # Datos de quien cancela (nombres desde PERSONA)
            user_db_data = await asyncio.to_thread(lambda: db_client.users.find_one({"_id": user_oid}, {"persona": 1}))
            p_cancel = await asyncio.to_thread(lambda: db_client.personas.find_one({"_id": (user_db_data or {}).get("persona")}, {"nombre": 1, "apellido": 1}))
            cancel_nombre = (p_cancel or {}).get("nombre", "") or ""
            cancel_apellido = (p_cancel or {}).get("apellido", "") or ""

            for usuario_data in reserva.get("usuarios", []):
                if str(usuario_data.get("id")) == user_id:
                    continue

                # email destinatario desde PERSONA
                e_dest = await asyncio.to_thread(lambda: _persona_email_por_user_id(usuario_data.get("id")))
                if not e_dest:
                    continue

                cancha_doc = await asyncio.to_thread(lambda: db_client.canchas.find_one({"_id": reserva["cancha"]}))
                await asyncio.to_thread(
                    notificar_cancelacion_reserva,
                    e_dest,
                    reserva["fecha"],
                    horario_doc["hora"],
                    cancha_doc["nombre"],
                    cancel_nombre,
                    cancel_apellido
                )
        except Exception as e:
            print(f"Error notificando cancelación a otros usuarios: {e}")

        return {"msg": "Reserva cancelada con éxito"}
    else:
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar la reserva con menos de 1 hora de antelación."
        )

@router.get("/cantidad")
async def obtener_cantidad_reservas(fecha: str):
    """Cantidad de usuarios por cancha/horario para una fecha (excluye Cancelada)."""
    try:
        datetime.strptime(fecha, "%d-%m-%Y")
        estado_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
        pipeline = [
            {"$match": {"fecha": fecha, "estado": {"$ne": estado_cancelada["_id"]}}},
            {"$project": {"cancha": 1, "hora_inicio": 1, "cantidad_usuarios": {"$size": "$usuarios"}}},
            {"$lookup": {"from": "canchas", "localField": "cancha", "foreignField": "_id", "as": "cancha_info"}},
            {"$unwind": "$cancha_info"},
            {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
            {"$unwind": "$horario_info"},
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
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use DD-MM-YYYY.")
    except Exception as e:
        print(f"Error al obtener cantidad de reservas: {str(e)}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener cantidad de reservas: {str(e)}")

def cerrar_reservas_vencidas():
    """
    Escanea reservas RESERVADAS con fecha <= hoy y las mueve:
      - Confirmada si >=2 confirmados
      - Cancelada en otro caso
    """
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    ahora = datetime.now(argentina_tz)
    hoy_str = ahora.strftime("%d-%m-%Y")

    est_res  = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    est_canc = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
    if not (est_res and est_conf and est_canc):
        print("❌ Faltan estados en estadoreserva")
        return 0

    horarios_map = {h["_id"]: h["hora"] for h in db_client.horarios.find({}, {"_id": 1, "hora": 1})}

    cursor = db_client.reservas.find(
        {"estado": est_res["_id"], "fecha": {"$lte": hoy_str}},
        {"_id": 1, "fecha": 1, "hora_inicio": 1, "usuarios.confirmado": 1}
    )

    to_cancel, to_confirm = [], []

    for r in cursor:
        hora_str = horarios_map.get(r["hora_inicio"])
        if not hora_str:
            continue
        try:
            hora_fin = hora_str.split("-")[1].strip()
            fin_naive = datetime.strptime(f"{r['fecha']} {hora_fin}", "%d-%m-%Y %H:%M")
            fin = argentina_tz.localize(fin_naive)
        except Exception as e:
            print(f"❌ Error parseando horario para {r.get('_id')}: {e}")
            continue

        if fin > ahora:
            continue

        confirmados = sum(1 for u in r.get("usuarios", []) if u.get("confirmado", False))
        if confirmados >= 2:
            to_confirm.append(r["_id"])
        else:
            to_cancel.append(r["_id"])

    if to_cancel:
        res1 = db_client.reservas.update_many({"_id": {"$in": to_cancel}}, {"$set": {"estado": est_canc["_id"]}})
        print(f"🗑️ Canceladas: {res1.modified_count}")

    if to_confirm:
        res2 = db_client.reservas.update_many({"_id": {"$in": to_confirm}}, {"$set": {"estado": est_conf["_id"]}})
        print(f"✅ Confirmadas al cerrar: {res2.modified_count}")

    try:
        if os.getenv("OPTIMIZE_INSIDE_CLOSE", "false").lower() == "true":
            optimize_weights()
            print("🎯 optimize_weights() ejecutado sobre reservas Confirmadas")
    except Exception as e:
        print(f"❌ Error en optimize_weights: {e}")

    return len(to_cancel) + len(to_confirm)

@router.get("/detalle")
async def detalle_reserva(cancha: str, horario: str, fecha: str, usuario_id: str = None):
    """Detalle de una reserva por slot, con usuarios (nombre/apellido desde PERSONAS)."""
    try:
        cancha_doc = db_client.canchas.find_one({"nombre": cancha})
        horario_doc = db_client.horarios.find_one({"hora": horario})
        if not cancha_doc or not horario_doc:
            raise HTTPException(status_code=404, detail="Cancha u horario no encontrados")

        estado_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
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

        # Precargar calificados por el viewer
        viewer_oid = ObjectId(usuario_id) if (usuario_id and ObjectId.is_valid(usuario_id)) else None
        calificados_set = set()
        if viewer_oid:
            reseñas = list(db_client.resenias.find({"i": viewer_oid, "reserva": reserva["_id"]}, {"j": 1}))
            calificados_set = {str(r["j"]) for r in reseñas}

        usuarios_info = []
        for usuario_data in reserva.get("usuarios", []):
            usuario_id_obj = usuario_data.get("id")
            if not usuario_id_obj:
                continue

            u = db_client.users.find_one({"_id": usuario_id_obj}, {"_id": 1, "username": 1, "persona": 1})
            if not u:
                continue

            p = None
            if u.get("persona"):
                p = db_client.personas.find_one({"_id": u["persona"]}, {"nombre": 1, "apellido": 1})

            usuarios_info.append({
                "nombre":   (p or {}).get("nombre", ""),
                "apellido": (p or {}).get("apellido", ""),
                "reserva_id": str(reserva["_id"]),
                "usuario_id": str(u["_id"]),
                "estado": str(reserva["estado"]),
                # ejemplo de flag útil para UI
                "calificado": False  # si querés mantener la lógica previa, reusa tu set de calificados
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
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener detalles: {str(e)}")

@router.post("/confirmar/{reserva_id}", dependencies=[Depends(verify_csrf)])
async def confirmar_reserva(reserva_id: str, current_user: dict = Depends(current_user)):
    """Confirma la asistencia del usuario a una reserva y cambia a Confirmada si hay >=2 confirmaciones."""
    try:
        user_id = ObjectId(current_user["id"])
        reserva_id_obj = ObjectId(reserva_id)

        estado_confirmada = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
        if not estado_confirmada:
            raise HTTPException(status_code=500, detail="Estado 'Confirmada' no encontrado en la base de datos")

        resultado = await asyncio.to_thread(lambda: db_client.reservas.update_one(
            {"_id": reserva_id_obj, "usuarios.id": user_id},
            {"$set": {"usuarios.$.confirmado": True}}
        ))
        if resultado.modified_count == 0:
            raise HTTPException(status_code=404, detail="Reserva no encontrada o usuario no está en la reserva")

        reserva_doc = await asyncio.to_thread(lambda: db_client.reservas.find_one({"_id": reserva_id_obj}))
        usuarios_confirmados = sum(1 for u in reserva_doc.get("usuarios", []) if u.get("confirmado", False))

        if usuarios_confirmados >= 2:
            await asyncio.to_thread(lambda: db_client.reservas.update_one(
                {"_id": reserva_id_obj},
                {"$set": {"estado": estado_confirmada["_id"]}}
            ))
            
            # --- NOTIFICACIONES / EMAILS ---
            try:
                # obtener strings correctos para email
                h_doc = db_client.horarios.find_one({"_id": reserva_doc["hora_inicio"]}, {"hora": 1})
                c_doc = db_client.canchas.find_one({"_id": reserva_doc["cancha"]}, {"nombre": 1})
                hora_str = (h_doc or {}).get("hora", "").split("-")[0]
                cancha_nombre = (c_doc or {}).get("nombre", "")

                # Si NO querés volver a notificar a tops/randoms en confirmar, dejá esto apagado:
                # enviar_notificaciones_slot(reserva_doc, current_user["id"], hora_str, cancha_nombre)

                # confirmación al que confirmó
                mi_mail = _persona_email_por_user_id(current_user["id"])
                if mi_mail and hora_str and cancha_nombre:
                    # Enviar confirmación inmediata
                    notificar_confirmacion_reserva(mi_mail, reserva_doc["fecha"], hora_str, cancha_nombre)
            except Exception as e:
                print(f"Error enviando notificaciones: {e}")
            
            return {"msg": "Asistencia confirmada. La reserva ha sido confirmada con éxito."}
        else:
            return {"msg": "Asistencia registrada. Se necesita al menos una confirmación más para confirmar la reserva."}

    except Exception as e:
        print(f"Error al confirmar asistencia: {str(e)}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al confirmar asistencia: {str(e)}")

@router.get("/listar", dependencies=[Depends(require_perms("reservas.dashboard.ver"))])
async def listar_reservas_por_fecha(
    fecha: str = Query(..., description="Fecha en formato DD-MM-YYYY"),
    user: dict = Depends(current_user),
) -> List[Dict]:
    """
    Devuelve reservas Confirmadas para una fecha dada, con:
    - _id (str)
    - cancha (nombre)
    - horario ("HH:MM-HH:MM")
    - usuario_nombre (nombres unidos por coma) — desde PERSONAS
    - estado (lowercase: 'confirmada')
    - resultado (si existe)
    """
    try:
        datetime.strptime(fecha, "%d-%m-%Y")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use DD-MM-YYYY.")

    estado_confirmada = await asyncio.to_thread(
        lambda: db_client.estadoreserva.find_one({"nombre": "Confirmada"}, {"_id": 1})
    )
    if not estado_confirmada:
        raise HTTPException(status_code=500, detail="Estado 'Confirmada' no encontrado en la base de datos")
    estado_id = estado_confirmada["_id"]

    # Pipeline: users -> personas
    pipeline = [
        {"$match": {"fecha": fecha, "estado": estado_id}},

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

        # Traigo los USERS de la reserva
        {"$lookup": {
            "from": "users",
            "localField": "usuarios.id",
            "foreignField": "_id",
            "as": "usuarios_info"
        }},

        # Ahora, con los persona_ids que hay en usuarios_info, traigo PERSONAS
        {"$lookup": {
            "from": "personas",
            "localField": "usuarios_info.persona",
            "foreignField": "_id",
            "as": "personas_info"
        }},

        # Proyecto todo lo necesario; los nombres saldrán de personas_info
        {"$project": {
            "_id": 1,
            "fecha": 1,
            "resultado": 1,
            "cancha": "$cancha_info.nombre",
            "horario": "$horario_info.hora",
            "personas_info": {
                "$map": {
                    "input": "$personas_info",
                    "as": "p",
                    "in": {
                        "nombre": {"$ifNull": ["$$p.nombre", ""]},
                        "apellido": {"$ifNull": ["$$p.apellido", ""]}
                    }
                }
            }
        }},
        {"$sort": {"horario": 1, "_id": 1}}
    ]

    docs = await asyncio.to_thread(lambda: list(db_client.reservas.aggregate(pipeline)))

    salida: List[Dict] = []
    for d in docs:
        nombres = []
        for p in d.get("personas_info", []):
            nom = (p.get("nombre") or "").strip()
            ape = (p.get("apellido") or "").strip()
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

# busqueda admin paginada + filtros
@router.post(
    "/admin/buscar",
    dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))]
)
async def admin_buscar_reservas(payload: AdminBuscarReservasRequest):
    """
    Búsqueda de reservas para admin con filtros y paginación.
    Filtros:
      - fecha: "DD-MM-YYYY" (exacta)
      - cancha: prefijo del nombre de cancha
      - usuario: prefijo en username / nombre / apellido
    Paginación:
      - page / limit
    Sin filtros: devuelve las 10 más recientes (fecha desc, horario desc)
    """
    page = max(1, int(payload.page or 1))
    limit = max(1, min(100, int(payload.limit or 10)))

    match = {}
    if payload.fecha:
        match["fecha"] = payload.fecha

    sin_filtros = not (payload.fecha or payload.cancha or payload.usuario)

    pipe = [
        {"$match": match},

        # --- Usuarios y persona ---
        {"$unwind": {"path": "$usuarios", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "users",
            "localField": "usuarios.id",
            "foreignField": "_id",
            "as": "u"
        }},
        {"$unwind": {"path": "$u", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "personas",
            "localField": "u.persona",
            "foreignField": "_id",
            "as": "p"
        }},
        {"$unwind": {"path": "$p", "preserveNullAndEmptyArrays": True}},
        {"$set": {
            "usuario_username": {"$ifNull": ["$u.username", ""]},
            "persona_nombre":   {"$ifNull": ["$p.nombre", ""]},
            "persona_apellido": {"$ifNull": ["$p.apellido", ""]},
        }},

        # --- Cancha: nombre legible ---
        {"$lookup": {
            "from": "canchas",
            "localField": "cancha",
            "foreignField": "_id",
            "as": "c"
        }},
        {"$unwind": {"path": "$c", "preserveNullAndEmptyArrays": True}},

        # --- Horario: nombre legible ---
        {"$lookup": {
            "from": "horarios",
            "localField": "hora_inicio",
            "foreignField": "_id",
            "as": "h"
        }},
        {"$unwind": {"path": "$h", "preserveNullAndEmptyArrays": True}},
        
        # --- Estado: nombre legible ---
        {"$lookup": {
            "from": "estadoreserva",
            "localField": "estado",
            "foreignField": "_id",
            "as": "estado_info"
        }},
        {"$unwind": {"path": "$estado_info", "preserveNullAndEmptyArrays": True}},
        
        {"$set": {
            "cancha_nombre": {"$ifNull": ["$c.nombre", {"$toString": "$cancha"}]},
            "horario": {"$ifNull": ["$h.hora", ""]},
            "estado_nombre": {"$ifNull": ["$estado_info.nombre", "Pendiente"]},
            # extraer hora de inicio "HH:MM" desde "HH:MM-HH:MM"
            "hora_inicio": {"$arrayElemAt": [{"$split": [{"$ifNull": ["$h.hora", "00:00-00:00"]}, "-"]}, 0]}
        }},
    ]

    # Filtro por usuario (prefijo) si vino término
    if payload.usuario:
        pipe.append({
            "$match": {
                "$or": [
                    {"usuario_username": _rx_prefix(payload.usuario)},
                    {"persona_nombre":   _rx_prefix(payload.usuario)},
                    {"persona_apellido": _rx_prefix(payload.usuario)},
                ]
            }
        })

    # Filtro por cancha (prefijo) si vino término
    if payload.cancha:
        pipe.append({
            "$match": {"cancha_nombre": _rx_prefix(payload.cancha)}
        })

    # Agrupamos nuevamente por reserva
    pipe += [
        {"$group": {
            "_id": "$_id",
            "cancha":  {"$first": "$cancha"},
            "cancha_nombre": {"$first": "$cancha_nombre"},
            "fecha":   {"$first": "$fecha"},
            "horario": {"$first": "$horario"},
            "hora_inicio": {"$first": "$hora_inicio"},
            "estado_nombre": {"$first": "$estado_nombre"},
            "usuarios": {"$addToSet": {
                "id": "$usuarios.id",
                "username": "$usuario_username",
                "nombre": "$persona_nombre",
                "apellido": "$persona_apellido",
            }}
        }},
        {"$project": {
            "cancha": 1, 
            "cancha_nombre": 1, 
            "fecha": 1, 
            "horario": 1,
            "hora_inicio": 1,
            "estado_nombre": 1,
            "usuarios": {
                "$filter": {
                    "input": "$usuarios",
                    "as": "u",
                    "cond": {"$and": [
                        {"$ne": ["$$u", None]},
                        {"$ne": ["$$u.id", None]}
                    ]}
                }
            }
        }},
    ]

    # Orden por defecto: si NO hay filtros => últimas 10 (desc); si hay filtros => asc
    if sin_filtros:
        pipe += [{"$sort": {"fecha": -1, "hora_inicio": -1, "cancha_nombre": 1}}]
    else:
        pipe += [{"$sort": {"fecha":  1, "hora_inicio":  1, "cancha_nombre": 1}}]

    pipe += [
        {"$facet": {
            "items": [
                {"$skip": (page - 1) * limit},
                {"$limit": limit if not sin_filtros else 10}
            ],
            "count": [{"$count": "total"}]
        }}
    ]

    def _op():
        out = list(db_client.reservas.aggregate(pipe))
        items = (out[0]["items"] if out else []) or []
        total = (out[0]["count"][0]["total"] if out and out[0]["count"] else 0)
        return items, total

    items, total = await asyncio.to_thread(_op)

    # normaliza ObjectId → str
    def _to_str(x):
        if isinstance(x, ObjectId): return str(x)
        if isinstance(x, list): return [_to_str(i) for i in x]
        if isinstance(x, dict): return {k: _to_str(v) for k, v in x.items()}
        return x

    return {
        "reservas": [_to_str(i) for i in items],
        "page": page,
        "limit": limit,
        "total": total
    }

@router.post("/admin/crear", dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))])
async def admin_crear_reserva(data: CrearReservaAdminRequest, user: dict = Depends(current_user)):
    """
    Crea una reserva en nombre de los usuarios seleccionados.
    Estado inicial: Reservada. Agenda recordatorios y envía email 'creada por administración'.
    """
    def _op():
        # ---- Validaciones/loads ----
        # Validar formato de fecha: DD-MM-YYYY
        fecha_guardar = data.fecha.strip()
        try:
            datetime.strptime(fecha_guardar, "%d-%m-%Y")
        except ValueError:
            raise ValueError("Formato de fecha inválido; usá DD-MM-YYYY")
        
        cancha_id = ObjectId(data.cancha_id)
        horario_id = ObjectId(data.horario_id)

        cancha = db_client.canchas.find_one({"_id": cancha_id})
        if not cancha:
            raise ValueError("Cancha no encontrada")

        horario = db_client.horarios.find_one({"_id": horario_id})
        if not horario:
            raise ValueError("Horario no encontrado")

        # Validar que el horario esté habilitado para la cancha
        horarios_cancha = cancha.get("horarios") or []
        if not isinstance(horarios_cancha, list) or horario_id not in horarios_cancha:
            raise ValueError("Ese horario no está habilitado para esta cancha")

        u_ids = [ObjectId(u) for u in data.usuarios]
        usuarios = list(db_client.users.find({"_id": {"$in": u_ids}}))
        if len(usuarios) != len(u_ids):
            raise ValueError("Algún usuario no existe")

        # Estado 'Reservada'
        est_res = db_client.estadoreserva.find_one({"nombre": "Reservada"})
        if not est_res:
            raise ValueError("Estado 'Reservada' no configurado")

        # Unicidad por (cancha, fecha, hora_inicio)
        ya = db_client.reservas.find_one({
            "cancha": cancha["_id"],
            "fecha": fecha_guardar,
            "hora_inicio": horario["_id"],
        })
        if ya:
            raise ValueError("Ya existe una reserva para esa cancha, fecha y hora")

        # Documento reserva
        argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
        
        # Para validaciones de tiempo y recordatorios
        hora_inicio_str = horario.get("hora", "").split("-")[0].strip()
        reserva_dt = argentina_tz.localize(
            datetime.strptime(f"{fecha_guardar} {hora_inicio_str}", "%d-%m-%Y %H:%M")
        )
        
        doc = OrderedDict([
            ("fecha", fecha_guardar),  # DD-MM-YYYY como string
            ("estado", est_res["_id"]),
            ("cancha", cancha["_id"]),
            ("hora_inicio", horario["_id"]),
            ("fecha_creacion", datetime.now(argentina_tz)),
            ("usuarios", [
                OrderedDict([
                    ("id", u["_id"]),
                    ("confirmado", False),
                    ("fecha_reserva", datetime.now(argentina_tz)),
                ]) for u in usuarios
            ]),
            ("resultado", ""),
        ])
        rid = db_client.reservas.insert_one(doc).inserted_id

        # emails destinatarios (join a personas)
        persona_ids = [u.get("persona") for u in usuarios if u.get("persona")]
        personas = list(db_client.personas.find(
            {"_id": {"$in": persona_ids}},
            {"email": 1, "nombre": 1, "apellido": 1}
        ))

        # Enviar emails (no bloquear si algo falla)
        for p in personas:
            try:
                from services.email import notificar_alta_reserva_admin
                notificar_alta_reserva_admin(
                    to=p.get("email"),
                    day=fecha_guardar,
                    hora=hora_inicio_str,
                    cancha=cancha.get("nombre", "")
                )
            except Exception as e:
                print(f"[warn] admin alta mail → {p.get('email')}: {e}")

        # Programar recordatorio normal (reutilizamos lo que ya tenés)
        try:
            from services.scheduler import programar_recordatorio_nueva_reserva
            programar_recordatorio_nueva_reserva(str(rid), fecha_guardar, hora_inicio_str)
        except Exception as e:
            print(f"[scheduler] no se pudo programar recordatorio: {e}")

        return rid

    try:
        rid = await asyncio.to_thread(_op)
        return {"ok": True, "id": str(rid), "message": "Reserva creada y usuarios notificados"}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error creando reserva: {e}")
