from fastapi import APIRouter, Query, Depends, HTTPException
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import current_user
from db.schemas.resenia_publica import top_jugadores_schema, ultimas_resenias_schema

router = APIRouter(
    prefix="/resenias",  
    tags=["Reseñas públicas"],
)

@router.get("/top-jugadores")
def top_jugadores(limit: int = Query(10, ge=1, le=50)):
    """
    Top por promedio (y desempate por cantidad). Compatible con users.nombre/apellido
    y, si ya migraste, con personas.* (prioriza personas cuando exista).
    """
    try:
        pipeline = [
            {"$group": {"_id": "$j", "promedio": {"$avg": "$numero"}, "cantidad": {"$sum": 1}}},
            {"$match": {"_id": {"$ne": None}}},
            {"$sort": {"promedio": -1, "cantidad": -1, "_id": 1}},
            {"$limit": limit},
            {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "u"}},
            {"$unwind": "$u"},
            {"$lookup": {"from": "personas", "localField": "u.persona", "foreignField": "_id", "as": "p"}},
            {"$unwind": {"path": "$p", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "jugador_id": {"$toString": "$_id"},
                "promedio": {"$round": ["$promedio", 2]},
                "cantidad": 1,
                "nombre": {"$ifNull": ["$p.nombre", ""]},
                "apellido": {"$ifNull": ["$p.apellido", ""]},
                "username": {"$ifNull": ["$u.username", ""]},
            }},
        ]
        rows = list(db_client.resenias.aggregate(pipeline))
        return top_jugadores_schema(rows)
    except Exception as e:
        print("Error en top-jugadores:", e)
        return []

@router.get("/ultimas")
def ultimas_resenias(limit: int = Query(10, ge=1, le=50)):
    """
    Últimas reseñas, con autor y destinatario. Lista segura para UI.
    """
    try:
        pipeline = [
            {"$sort": {"fecha": -1, "_id": -1}},
            {"$limit": limit},

            # Autor
            {"$lookup": {"from": "users", "localField": "i", "foreignField": "_id", "as": "autor_u"}},
            {"$unwind": "$autor_u"},
            {"$lookup": {"from": "personas", "localField": "autor_u.persona", "foreignField": "_id", "as": "autor_p"}},
            {"$unwind": {"path": "$autor_p", "preserveNullAndEmptyArrays": True}},

            # Destinatario
            {"$lookup": {"from": "users", "localField": "j", "foreignField": "_id", "as": "dest_u"}},
            {"$unwind": "$dest_u"},
            {"$lookup": {"from": "personas", "localField": "dest_u.persona", "foreignField": "_id", "as": "dest_p"}},
            {"$unwind": {"path": "$dest_p", "preserveNullAndEmptyArrays": True}},

            {"$project": {
                "_id": {"$toString": "$_id"},
                "numero": 1,
                "observacion": {"$ifNull": ["$observacion", ""]},
                "fecha": 1,
                "autor": {
                    "id": {"$toString": "$autor_u._id"},
                    "nombre": {"$ifNull": ["$autor_p.nombre", ""]},
                    "apellido": {"$ifNull": ["$autor_p.apellido", ""]},
                    "username": {"$ifNull": ["$autor_u.username", ""]},
                },
                "destinatario": {
                    "id": {"$toString": "$dest_u._id"},
                    "nombre": {"$ifNull": ["$dest_p.nombre", ""]},
                    "apellido": {"$ifNull": ["$dest_p.apellido", ""]},
                    "username": {"$ifNull": ["$dest_u.username", ""]},
                },
            }},
        ]
        rows = list(db_client.resenias.aggregate(pipeline))
        return ultimas_resenias_schema(rows)
    except Exception as e:
        print("Error en ultimas:", e)
        return []

@router.get("/stats")
def mis_resenias_stats(user=Depends(current_user)):
    """
    Promedio y cantidad de reseñas recibidas + últimas 5 con autor.
    """
    try:
        if not user or not user.get("id") or not ObjectId.is_valid(user["id"]):
            raise HTTPException(status_code=401, detail="Usuario no autenticado")

        j_oid = ObjectId(user["id"])

        # promedio / cantidad
        g = list(db_client.resenias.aggregate([
            {"$match": {"j": j_oid}},
            {"$group": {"_id": None, "promedio": {"$avg": "$numero"}, "cantidad": {"$sum": 1}}},
        ]))
        promedio = round(float(g[0]["promedio"]), 2) if g else 0.0
        cantidad = int(g[0]["cantidad"]) if g else 0

        # últimas 5 con autor
        pipeline = [
            {"$match": {"j": j_oid}},
            {"$sort": {"fecha": -1, "_id": -1}},
            {"$limit": 5},
            {"$lookup": {"from": "users", "localField": "i", "foreignField": "_id", "as": "autor_u"}},
            {"$unwind": "$autor_u"},
            {"$lookup": {"from": "personas", "localField": "autor_u.persona", "foreignField": "_id", "as": "autor_p"}},
            {"$unwind": {"path": "$autor_p", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "numero": 1,
                "observacion": {"$ifNull": ["$observacion", ""]},
                "fecha": 1,
                "autor": {
                    "id": {"$toString": "$autor_u._id"},
                    "nombre": {"$ifNull": ["$autor_p.nombre", ""]},
                    "apellido": {"$ifNull": ["$autor_p.apellido", ""]},
                    "username": {"$ifNull": ["$autor_u.username", ""]},
                },
            }},
        ]
        ultimas = list(db_client.resenias.aggregate(pipeline))

        return {"promedio": promedio, "cantidad": cantidad, "ultimas": ultimas}
    except HTTPException:
        raise
    except Exception as e:
        print("Error en stats:", e)
        return {"promedio": 0.0, "cantidad": 0, "ultimas": []}
