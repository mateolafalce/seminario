import asyncio
from fastapi import FastAPI
from routers import users_b, admin_users, reservas, preferencias, canchas, empleado, horarios, resenias
from db.client import db_client
from services.scheduler import start_scheduler, shutdown_scheduler
from services.matcheo import calculate_and_store_relations  
from routers.reservas import cerrar_reservas_vencidas
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(users_b.router, prefix="/api")
app.include_router(admin_users.router_admin, prefix="/api")
app.include_router(reservas.router, prefix="/api")
app.include_router(preferencias.router, prefix="/api")
app.include_router(canchas.router, prefix="/api")
app.include_router(empleado.router, prefix="/api") 
app.include_router(horarios.router, prefix="/api") 
app.include_router(resenias.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    try:
        cerradas = cerrar_reservas_vencidas()
        print(f"🔁 Cierre inicial: {cerradas} reservas procesadas (Confirmada/Cancelada)")
    except Exception as e:
        print(f"Error al cerrar reservas en startup: {e}")
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    shutdown_scheduler()
