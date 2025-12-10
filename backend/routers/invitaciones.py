"""
Router para gestionar invitaciones a partidos.
Permite:
- Listar usuarios disponibles para invitar
- Enviar invitaciones por email
- Buscar jugadores faltantes con el algoritmo de matcheo
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel, Field
import asyncio

from db.client import db_client
from routers.Security.auth import current_user, verify_csrf
from services.matcheo import get_top_matches_from_db, get_random_users
from services.email import notificar_invitacion_partido

router = APIRouter(
    prefix="/invitaciones",
    tags=["invitaciones"],
    responses={404: {"message": "No encontrado"}},
)


# ==========================
# Pydantic Models
# ==========================

class InvitarJugadoresRequest(BaseModel):
    usuario_ids: List[str] = Field(..., min_items=1, max_items=50)
    fecha: str = Field(..., description="Fecha en formato DD-MM-YYYY")
    horario: str = Field(..., description="Horario del partido")
    cancha: str = Field(..., description="Nombre de la cancha")
    invitante_nombre: str = Field(default="Un jugador")


class BuscarMatcheoRequest(BaseModel):
    cantidad_faltantes: int = Field(..., ge=1, le=50)
    usuario_ids_actuales: List[str] = Field(default_factory=list)
    fecha: str = Field(..., description="Fecha en formato DD-MM-YYYY")
    horario: str = Field(..., description="Horario del partido")


# ==========================
# Endpoints
# ==========================

@router.get("/usuarios-disponibles")
async def listar_usuarios_disponibles(
    search: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(current_user)
):
    """
    Lista usuarios habilitados del sistema que pueden ser invitados.
    Excluye al usuario actual.
    """
    user_id = user.get("id")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Usuario no válido")
    
    user_oid = ObjectId(user_id)
    
    def _buscar():
        # Base query: habilitados y no el usuario actual
        match = {"habilitado": True, "_id": {"$ne": user_oid}}
        
        # Si hay búsqueda, buscar en persona (nombre/apellido)
        if search and search.strip():
            search_regex = {"$regex": search.strip(), "$options": "i"}
            # Buscar personas que coincidan
            personas_ids = list(db_client.personas.find(
                {"$or": [
                    {"nombre": search_regex},
                    {"apellido": search_regex},
                    {"email": search_regex}
                ]},
                {"_id": 1}
            ))
            if personas_ids:
                match["persona"] = {"$in": [p["_id"] for p in personas_ids]}
            else:
                # También buscar por username
                match["username"] = search_regex
        
        # Pipeline para obtener usuarios con datos de persona
        pipeline = [
            {"$match": match},
            {"$lookup": {
                "from": "personas",
                "localField": "persona",
                "foreignField": "_id",
                "as": "persona_info"
            }},
            {"$unwind": {"path": "$persona_info", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {
                "from": "categorias",
                "localField": "categoria",
                "foreignField": "_id",
                "as": "categoria_info"
            }},
            {"$unwind": {"path": "$categoria_info", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "_id": 0,
                "id": {"$toString": "$_id"},
                "username": 1,
                "nombre": {"$ifNull": ["$persona_info.nombre", ""]},
                "apellido": {"$ifNull": ["$persona_info.apellido", ""]},
                "email": {"$ifNull": ["$persona_info.email", ""]},
                "categoria": {"$ifNull": ["$categoria_info.nombre", "Sin categoría"]}
            }},
            {"$limit": limit}
        ]
        
        return list(db_client.users.aggregate(pipeline))
    
    usuarios = await asyncio.to_thread(_buscar)
    
    return {
        "usuarios": usuarios,
        "total": len(usuarios)
    }


@router.post("/enviar", dependencies=[Depends(verify_csrf)])
async def enviar_invitaciones(
    request: InvitarJugadoresRequest,
    user: dict = Depends(current_user)
):
    """
    Envía invitaciones por email a los jugadores seleccionados.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Usuario no válido")
    
    # Obtener nombre del invitante
    def _get_invitante_nombre():
        user_doc = db_client.users.find_one({"_id": ObjectId(user_id)}, {"persona": 1})
        if user_doc and user_doc.get("persona"):
            persona = db_client.personas.find_one({"_id": user_doc["persona"]}, {"nombre": 1, "apellido": 1})
            if persona:
                return f"{persona.get('nombre', '')} {persona.get('apellido', '')}".strip()
        return "Un jugador"
    
    invitante_nombre = await asyncio.to_thread(_get_invitante_nombre)
    
    enviados = []
    fallidos = []
    
    def _enviar_invitaciones():
        for uid in request.usuario_ids:
            if not ObjectId.is_valid(uid):
                fallidos.append({"id": uid, "error": "ID inválido"})
                continue
            
            # Obtener email del usuario
            user_doc = db_client.users.find_one({"_id": ObjectId(uid)}, {"persona": 1, "habilitado": 1})
            if not user_doc or not user_doc.get("habilitado"):
                fallidos.append({"id": uid, "error": "Usuario no habilitado"})
                continue
            
            if not user_doc.get("persona"):
                fallidos.append({"id": uid, "error": "Sin persona asociada"})
                continue
            
            persona = db_client.personas.find_one({"_id": user_doc["persona"]}, {"email": 1, "nombre": 1})
            if not persona or not persona.get("email"):
                fallidos.append({"id": uid, "error": "Sin email"})
                continue
            
            email = persona["email"]
            nombre_destinatario = persona.get("nombre", "Jugador")
            
            try:
                ok = notificar_invitacion_partido(
                    to=email,
                    nombre_destinatario=nombre_destinatario,
                    invitante=invitante_nombre,
                    fecha=request.fecha,
                    hora=request.horario,
                    cancha=request.cancha
                )
                if ok:
                    enviados.append({"id": uid, "email": email})
                else:
                    fallidos.append({"id": uid, "error": "Error al enviar"})
            except Exception as e:
                fallidos.append({"id": uid, "error": str(e)})
    
    await asyncio.to_thread(_enviar_invitaciones)
    
    return {
        "enviados": len(enviados),
        "fallidos": len(fallidos),
        "detalle_enviados": enviados,
        "detalle_fallidos": fallidos
    }


@router.post("/buscar-matcheo")
async def buscar_jugadores_matcheo(
    request: BuscarMatcheoRequest,
    user: dict = Depends(current_user)
):
    """
    Busca jugadores compatibles usando el algoritmo de matcheo.
    Devuelve una lista de usuarios sugeridos para completar el partido.
    """
    user_id = user.get("id")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Usuario no válido")
    
    def _buscar_matcheo():
        # Excluir al usuario actual y a los ya incluidos
        excluir = set(request.usuario_ids_actuales) | {user_id}
        
        # Obtener top matches del algoritmo
        cantidad_top = min(request.cantidad_faltantes * 2, 20)  # Buscar el doble para dar opciones
        top_matches = get_top_matches_from_db(
            user_id=user_id,
            exclude_user_ids=list(excluir),
            top_x=cantidad_top
        )
        
        # Si no hay suficientes matches, complementar con aleatorios
        usuarios_sugeridos = []
        for uid, score in top_matches:
            if len(usuarios_sugeridos) >= request.cantidad_faltantes * 2:
                break
            
            user_doc = db_client.users.find_one(
                {"_id": ObjectId(uid), "habilitado": True},
                {"persona": 1, "username": 1, "categoria": 1}
            )
            if not user_doc:
                continue
            
            persona = None
            if user_doc.get("persona"):
                persona = db_client.personas.find_one(
                    {"_id": user_doc["persona"]},
                    {"nombre": 1, "apellido": 1, "email": 1}
                )
            
            categoria_nombre = "Sin categoría"
            if user_doc.get("categoria"):
                cat = db_client.categorias.find_one({"_id": user_doc["categoria"]}, {"nombre": 1})
                if cat:
                    categoria_nombre = cat.get("nombre", "Sin categoría")
            
            usuarios_sugeridos.append({
                "id": uid,
                "username": user_doc.get("username", ""),
                "nombre": (persona or {}).get("nombre", ""),
                "apellido": (persona or {}).get("apellido", ""),
                "email": (persona or {}).get("email", ""),
                "categoria": categoria_nombre,
                "match_score": round(score, 3),
                "sugerido_por": "matcheo"
            })
        
        # Si faltan, agregar aleatorios
        if len(usuarios_sugeridos) < request.cantidad_faltantes:
            exclude_more = list(excluir) + [u["id"] for u in usuarios_sugeridos]
            faltantes = request.cantidad_faltantes - len(usuarios_sugeridos)
            random_ids = get_random_users(exclude_user_ids=exclude_more, count=faltantes)
            
            for rid in random_ids:
                user_doc = db_client.users.find_one(
                    {"_id": ObjectId(rid), "habilitado": True},
                    {"persona": 1, "username": 1, "categoria": 1}
                )
                if not user_doc:
                    continue
                
                persona = None
                if user_doc.get("persona"):
                    persona = db_client.personas.find_one(
                        {"_id": user_doc["persona"]},
                        {"nombre": 1, "apellido": 1, "email": 1}
                    )
                
                categoria_nombre = "Sin categoría"
                if user_doc.get("categoria"):
                    cat = db_client.categorias.find_one({"_id": user_doc["categoria"]}, {"nombre": 1})
                    if cat:
                        categoria_nombre = cat.get("nombre", "Sin categoría")
                
                usuarios_sugeridos.append({
                    "id": rid,
                    "username": user_doc.get("username", ""),
                    "nombre": (persona or {}).get("nombre", ""),
                    "apellido": (persona or {}).get("apellido", ""),
                    "email": (persona or {}).get("email", ""),
                    "categoria": categoria_nombre,
                    "match_score": 0,
                    "sugerido_por": "aleatorio"
                })
        
        return usuarios_sugeridos
    
    sugeridos = await asyncio.to_thread(_buscar_matcheo)
    
    return {
        "sugeridos": sugeridos,
        "cantidad_solicitada": request.cantidad_faltantes,
        "cantidad_encontrada": len(sugeridos)
    }


@router.get("/capacidad-cancha/{cancha_nombre}")
async def obtener_capacidad_cancha(
    cancha_nombre: str,
    user: dict = Depends(current_user)
):
    """
    Obtiene la capacidad máxima de una cancha.
    """
    def _get_capacidad():
        cancha = db_client.canchas.find_one({"nombre": cancha_nombre}, {"capacidad_maxima": 1})
        if not cancha:
            return None
        return cancha.get("capacidad_maxima", 6)
    
    capacidad = await asyncio.to_thread(_get_capacidad)
    
    if capacidad is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    
    return {"cancha": cancha_nombre, "capacidad_maxima": capacidad}
