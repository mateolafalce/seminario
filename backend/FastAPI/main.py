### Hola Mundo ###

# Documentación oficial: https://fastapi.tiangolo.com/es/

from fastapi import FastAPI
from routers import users_b, admin_users
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(users_b.router)
app.include_router(admin_users.router_admin)
origins = [
    "http://localhost:8000",
    "*"
]

app.add_middleware(
     CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],  # Permite todos los headers, o especifica los que necesites
)







#app.mount("/static", StaticFiles(directory="static"), name="static")

# Url local: http://127.0.0.1:8000/url
    
# Inicia el server: uvicorn main:app --reload
# Detener el server: CTRL+C

# Documentación con Swagger: http://127.0.0.1:8000/docs
# Documentación con Redocly: http://127.0.0.1:8000/redoc
