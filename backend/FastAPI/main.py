from fastapi import FastAPI
from routers import users_b, admin_users, reservas, preferencias
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(users_b.router)
app.include_router(admin_users.router_admin)
app.include_router(reservas.router)
app.include_router(preferencias.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
