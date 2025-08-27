from apscheduler.schedulers.asyncio import AsyncIOScheduler
from db.client import db_client
from routers.reservas import actualizar_reservas_completadas
from services.matcheo import calculate_and_store_relations


scheduler = AsyncIOScheduler()

def schedule_jobs():
    try:
        # Programar la actualización de reservas cada 1:30
        scheduler.add_job(
            actualizar_reservas_completadas,
            'interval',
            #hours=1,
            #minutes=30,
            #minutes=1,
            id='actualizar_reservas_job',
            replace_existing=True
        )
        print("Job de actualización de reservas programado cada 1:30")

        # Programar el cálculo de relaciones cada 1 hora
        scheduler.add_job(
            calculate_and_store_relations,
            'interval',
            hours=2,
            #minutes=1,
            id='calculate_relations_job',
            replace_existing=True
        )
        print("Job de cálculo de relaciones programado cada 1 hora")

        horarios_collection = db_client.horarios
        horarios = list(horarios_collection.find({}, {"_id": 0, "hora": 1}))

        for horario in horarios:
            hora_str = horario.get("hora")
            if hora_str:
                try:
                    start_time_str = hora_str.split('-')[0]
                    hour, minute = map(int, start_time_str.split(':'))
                    print(f"Scheduled job for {hour:02d}:{minute:02d}")
                except (ValueError, IndexError) as e:
                    print(f"Could not parse time '{hora_str}': {e}")
        
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

