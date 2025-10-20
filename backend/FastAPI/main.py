# main.py
from routers import matcheo_debug as matcheo_debug_router  
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from routers import users_b, admin_users, reservas, preferencias, canchas, empleado, horarios, resenias, resenias_publicas
from services.scheduler import start_scheduler, shutdown_scheduler
from services.notifs import ensure_notif_indexes, ensure_unique_slot_index
from routers.reservas import cerrar_reservas_vencidas

def _bool_env(key: str, default=False):
    return os.getenv(key, str(default)).lower() == "true"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # === STARTUP ===
    # 1) índices (rápido – Mongo >=4.2 no bloquea writes durante index build concurrente)
    try:
        await asyncio.to_thread(ensure_notif_indexes)
        await asyncio.to_thread(ensure_unique_slot_index)
    except Exception as e:
        print(f"Error creando índices: {e}")

    # 2) NO bloquees startup con trabajo pesado
    if _bool_env("HEAVY_ON_BOOT", False):
        # dispara sin esperar (fire-and-forget)
        asyncio.create_task(asyncio.to_thread(cerrar_reservas_vencidas))
    else:
        print("⏭️ HEAVY_ON_BOOT desactivado")

    # 3) scheduler en background
    start_scheduler()

    yield

    # === SHUTDOWN ===
    shutdown_scheduler()

app = FastAPI(lifespan=lifespan)

# Routers
app.include_router(users_b.router, prefix="/api")
app.include_router(admin_users.router_admin, prefix="/api")
app.include_router(reservas.router, prefix="/api")
app.include_router(preferencias.router, prefix="/api")
app.include_router(canchas.router, prefix="/api")
app.include_router(empleado.router, prefix="/api")
app.include_router(horarios.router, prefix="/api")
app.include_router(resenias.router, prefix="/api")
app.include_router(resenias_publicas.router, prefix="/api")
app.include_router(matcheo_debug_router.router, prefix="/api") 

# Static
app.mount("/images", StaticFiles(directory="static/images"), name="images")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
