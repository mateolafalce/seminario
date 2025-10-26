from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
import os
import logging
import uuid
from routers import users_b, admin_users, reservas, preferencias, canchas, horarios, resenias, resenias_publicas
from routers import reservas_resultados  # <- nuevo
from routers import categorias
from services.scheduler import start_scheduler, shutdown_scheduler
from services.notifs import ensure_notif_indexes, ensure_unique_slot_index
from routers.reservas import cerrar_reservas_vencidas
from services.authz import ensure_rbac_indexes_and_seed 
from services.persona import ensure_persona_indexes 
from services.user import ensure_user_indexes  
from routers.preferencias import ensure_preferencias_indexes
from services.canchas import ensure_cancha_indexes
from routers.horarios import ensure_horarios_indexes
from services.resenias import ensure_resenias_indexes
from services.categorias import ensure_categoria_indexes
from routers.Security.auth import ACCESS_COOKIE, CSRF_COOKIE

def _bool_env(key: str, default=False):
    return os.getenv(key, str(default)).lower() == "true"

ENABLE_MATCHEO_DEBUG = os.getenv("ENABLE_MATCHEO_DEBUG", "false").lower() == "true"

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await asyncio.to_thread(ensure_notif_indexes)
        await asyncio.to_thread(ensure_unique_slot_index)
        await asyncio.to_thread(ensure_rbac_indexes_and_seed)
        await asyncio.to_thread(ensure_persona_indexes)
        await asyncio.to_thread(ensure_user_indexes)
        await asyncio.to_thread(ensure_preferencias_indexes)
        await asyncio.to_thread(ensure_cancha_indexes)
        await asyncio.to_thread(ensure_horarios_indexes)
        await asyncio.to_thread(ensure_resenias_indexes)
        await asyncio.to_thread(ensure_categoria_indexes)
    except Exception as e:
        print(f"Error creando índices/seed: {e}")

    if _bool_env("HEAVY_ON_BOOT", False):
        asyncio.create_task(asyncio.to_thread(cerrar_reservas_vencidas))
    else:
        print("⏭️ HEAVY_ON_BOOT desactivado")

    start_scheduler()

    yield

    # === SHUTDOWN ===
    shutdown_scheduler()

app = FastAPI(lifespan=lifespan)
sec_log = logging.getLogger("security")
sec_log.setLevel(logging.INFO)

@app.middleware("http")
async def security_log_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request.state.req_id = req_id
    has_access = bool(request.cookies.get(ACCESS_COOKIE))
    has_csrf = bool(request.cookies.get(CSRF_COOKIE))
    sec_log.info(f"[{req_id}] IN  {request.method} {request.url.path} cookies: access={has_access} csrf={has_csrf}")
    response = await call_next(request)
    sec_log.info(f"[{req_id}] OUT {response.status_code} {request.method} {request.url.path}")
    return response

# Routers
app.include_router(users_b.router, prefix="/api")
app.include_router(admin_users.router_admin, prefix="/api")
app.include_router(reservas.router, prefix="/api")
app.include_router(preferencias.router, prefix="/api")
app.include_router(canchas.router, prefix="/api")
app.include_router(horarios.router, prefix="/api")
app.include_router(resenias.router, prefix="/api")
app.include_router(resenias_publicas.router, prefix="/api")
app.include_router(reservas_resultados.router, prefix="/api")
app.include_router(categorias.router, prefix="/api")

# 📴 Debug deshabilitado por defecto
if ENABLE_MATCHEO_DEBUG:
    from routers import matcheo_debug as matcheo_debug_router
    app.include_router(matcheo_debug_router.router, prefix="/api")
else:
    print("⏭️ /api/matcheo-debug deshabilitado")

# Static
app.mount("/images", StaticFiles(directory="static/images"), name="images")

# CORS
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
