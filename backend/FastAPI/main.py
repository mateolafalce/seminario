### Hola Mundo ###

# Documentación oficial: https://fastapi.tiangolo.com/es/

from fastapi import FastAPI
from routers import users_b
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # o ["*"] para permitir todo (solo en dev)
    allow_credentials=True,
    allow_methods=["*"],  # o ["POST", "GET"] etc.
    allow_headers=["*"],
)

app.include_router(users_b.router)

#app.mount("/static", StaticFiles(directory="static"), name="static")

# Url local: http://127.0.0.1:8000/url
@app.get("/url")
async def url():
    return {"url": "https://mouredev.com/python"}
    
# Inicia el server: uvicorn main:app --reload
# Detener el server: CTRL+C

# Documentación con Swagger: http://127.0.0.1:8000/docs
# Documentación con Redocly: http://127.0.0.1:8000/redoc
