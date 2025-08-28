from apscheduler.schedulers.asyncio import AsyncIOScheduler
from db.client import db_client
from routers.reservas import actualizar_reservas_completadas
from services.matcheo import calculate_and_store_relations
from services.email import notificar_recordatorio
from datetime import datetime, timedelta
import pytz
from bson import ObjectId

scheduler = AsyncIOScheduler()

def enviar_recordatorio_especifico(reserva_id: str):
    """Envía recordatorio para una reserva específica"""
    print(f"🔔 Enviando recordatorio para reserva {reserva_id}")
    
    try:
        reserva_oid = ObjectId(reserva_id)
        
        # Pipeline para obtener información completa de la reserva
        pipeline = [
            {"$match": {"_id": reserva_oid}},
            {"$lookup": {
                "from": "estadoreserva",
                "localField": "estado", 
                "foreignField": "_id",
                "as": "estado_info"
            }},
            {"$unwind": "$estado_info"},
            {"$lookup": {
                "from": "horarios",
                "localField": "hora_inicio", 
                "foreignField": "_id",
                "as": "horario_info"
            }},
            {"$unwind": "$horario_info"},
            {"$lookup": {
                "from": "canchas",
                "localField": "cancha",
                "foreignField": "_id", 
                "as": "cancha_info"
            }},
            {"$unwind": "$cancha_info"},
            {"$lookup": {
                "from": "users",
                "localField": "usuario",
                "foreignField": "_id",
                "as": "usuario_info"
            }},
            {"$unwind": "$usuario_info"}
        ]
        
        reserva_completa = list(db_client.reservas.aggregate(pipeline))
        
        if not reserva_completa:
            print(f"❌ No se encontró la reserva {reserva_id}")
            return
            
        reserva = reserva_completa[0]
        
        # Verificar que la reserva aún esté en estado "Reservada"
        if reserva["estado_info"]["nombre"] != "Reservada":
            print(f"ℹ️ Reserva {reserva_id} ya no está en estado 'Reservada' (estado actual: {reserva['estado_info']['nombre']})")
            return
        
        # Enviar recordatorio
        print(f"📧 Enviando recordatorio a {reserva['usuario_info']['email']}")
        print(f"   📅 Fecha: {reserva['fecha']}")
        print(f"   🕐 Hora: {reserva['horario_info']['hora']}")
        print(f"   🏟️ Cancha: {reserva['cancha_info']['nombre']}")
        
        notificar_recordatorio(
            to=reserva['usuario_info']['email'],
            day=reserva['fecha'],
            hora=reserva['horario_info']['hora'],
            cancha=reserva['cancha_info']['nombre']
        )
        
        print(f"✅ Recordatorio enviado exitosamente para reserva {reserva_id}")
        
    except Exception as e:
        print(f"❌ Error enviando recordatorio para reserva {reserva_id}: {e}")
        import traceback
        traceback.print_exc()

def programar_recordatorios_existentes():
    """Programa recordatorios para todas las reservas existentes que aún no han comenzado"""
    print("🔄 Programando recordatorios para reservas existentes...")
    
    argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
    ahora = datetime.now(argentina_tz)
    
    # Obtener estado "Reservada"
    estado_reservada = db_client.estadoreserva.find_one({"nombre": "Reservada"})
    if not estado_reservada:
        print("❌ No se encontró el estado 'Reservada'")
        return
    
    # Pipeline para obtener reservas futuras
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
            "hora_inicio_str": {
                "$arrayElemAt": [
                    {"$split": ["$horario_info.hora", "-"]}, 0
                ]
            }
        }}
    ]
    
    reservas = list(db_client.reservas.aggregate(pipeline))
    programados = 0
    
    for reserva in reservas:
        try:
            fecha_str = reserva["fecha"]
            hora_inicio_str = reserva["hora_inicio_str"]
            
            # Convertir a datetime
            reserva_inicio_dt_naive = datetime.strptime(f"{fecha_str} {hora_inicio_str}", "%d-%m-%Y %H:%M")
            
            try:
                reserva_inicio_dt = argentina_tz.localize(reserva_inicio_dt_naive)
            except ValueError:
                reserva_inicio_dt = argentina_tz.localize(reserva_inicio_dt_naive, is_dst=None)
            
            # Calcular hora del recordatorio (1 hora antes)
            hora_recordatorio = reserva_inicio_dt - timedelta(hours=1)
            
            # Solo programar si el recordatorio es en el futuro
            if hora_recordatorio > ahora:
                job_id = f"recordatorio_{str(reserva['_id'])}"
                
                # Verificar si ya existe un job programado para esta reserva
                existing_job = scheduler.get_job(job_id)
                if existing_job:
                    print(f"ℹ️ Ya existe recordatorio programado para reserva {reserva['_id']}")
                    continue
                
                scheduler.add_job(
                    enviar_recordatorio_especifico,
                    'date',
                    run_date=hora_recordatorio,
                    args=[str(reserva['_id'])],
                    id=job_id,
                    replace_existing=True
                )
                
                print(f"⏰ Programado recordatorio para reserva {reserva['_id']}")
                print(f"   📅 Reserva: {fecha_str} a las {hora_inicio_str}")
                print(f"   🔔 Recordatorio: {hora_recordatorio.strftime('%d-%m-%Y %H:%M')}")
                
                programados += 1
            else:
                print(f"⏭️ Recordatorio para reserva {reserva['_id']} ya pasó")
                
        except Exception as e:
            print(f"❌ Error procesando reserva {reserva.get('_id', 'unknown')}: {e}")
            continue
    
    print(f"✅ Se programaron {programados} recordatorios")
    return programados

def programar_recordatorio_nueva_reserva(reserva_id: str, fecha: str, hora_inicio: str):
    """Programa recordatorio para una nueva reserva"""
    print(f"📝 Programando recordatorio para nueva reserva {reserva_id}")
    
    try:
        argentina_tz = pytz.timezone("America/Argentina/Buenos_Aires")
        ahora = datetime.now(argentina_tz)
        
        # Convertir a datetime
        reserva_inicio_dt_naive = datetime.strptime(f"{fecha} {hora_inicio}", "%d-%m-%Y %H:%M")
        
        try:
            reserva_inicio_dt = argentina_tz.localize(reserva_inicio_dt_naive)
        except ValueError:
            reserva_inicio_dt = argentina_tz.localize(reserva_inicio_dt_naive, is_dst=None)
        
        # Calcular hora del recordatorio (1 hora antes)
        hora_recordatorio = reserva_inicio_dt - timedelta(hours=1)
        
        # Solo programar si el recordatorio es en el futuro
        if hora_recordatorio > ahora:
            job_id = f"recordatorio_{reserva_id}"
            
            scheduler.add_job(
                enviar_recordatorio_especifico,
                'date',
                run_date=hora_recordatorio,
                args=[reserva_id],
                id=job_id,
                replace_existing=True
            )
            
            print(f"✅ Recordatorio programado exitosamente")
            print(f"   📅 Reserva: {fecha} a las {hora_inicio}")
            print(f"   🔔 Recordatorio: {hora_recordatorio.strftime('%d-%m-%Y %H:%M')}")
            return True
        else:
            print(f"⚠️ No se puede programar recordatorio - la hora ya pasó")
            return False
            
    except Exception as e:
        print(f"❌ Error programando recordatorio para reserva {reserva_id}: {e}")
        return False

def cancelar_recordatorio_reserva(reserva_id: str):
    """Cancela el recordatorio programado para una reserva"""
    job_id = f"recordatorio_{reserva_id}"
    
    try:
        job = scheduler.get_job(job_id)
        if job:
            scheduler.remove_job(job_id)
            print(f"🗑️ Recordatorio cancelado para reserva {reserva_id}")
            return True
        else:
            print(f"ℹ️ No había recordatorio programado para reserva {reserva_id}")
            return False
    except Exception as e:
        print(f"❌ Error cancelando recordatorio para reserva {reserva_id}: {e}")
        return False

def schedule_jobs():
    try:
        # Programar la actualización de reservas cada 1:30
        scheduler.add_job(
            actualizar_reservas_completadas,
            'interval',
            hours=1,
            minutes=30,
            id='actualizar_reservas_job',
            replace_existing=True
        )
        print("Job de actualización de reservas programado cada 1:30")

        # Programar el cálculo de relaciones cada 2 horas
        scheduler.add_job(
            calculate_and_store_relations,
            'interval',
            hours=2,
            id='calculate_relations_job',
            replace_existing=True
        )
        print("Job de cálculo de relaciones programado cada 2 horas")

        # Programar recordatorios para reservas existentes
        programar_recordatorios_existentes()
        
    except Exception as e:
        print(f"Error connecting to DB or scheduling jobs: {e}")

def start_scheduler():
    schedule_jobs()
    if not scheduler.running:
        scheduler.start()
        print("Scheduler started.")
    else:
        print("Scheduler is already running.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("Scheduler shut down.")

