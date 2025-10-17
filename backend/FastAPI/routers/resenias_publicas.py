from fastapi import APIRouter, Query, Depends, HTTPException
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import current_user

router = APIRouter(
    prefix="/resenias",   # 👈👈 clave
    tags=["Reseñas públicas"],
)

@router.get("/top-jugadores")
def top_jugadores(limit: int = Query(10, ge=1, le=50)):
    try:
        # Obtener todas las reseñas y procesar en Python para simplicidad
        resenias = list(db_client.resenias.find({}, {"j": 1, "numero": 1}))
        
        # Agrupar por usuario j y calcular promedio/cantidad
        user_stats = {}
        for r in resenias:
            j_id = str(r.get("j", ""))
            if j_id:
                if j_id not in user_stats:
                    user_stats[j_id] = {"total": 0, "count": 0}
                user_stats[j_id]["total"] += r.get("numero", 0)
                user_stats[j_id]["count"] += 1
        
        # Calcular promedios y obtener datos de usuarios
        result = []
        for j_id, stats in user_stats.items():
            if stats["count"] >= 1:  # Mínimo 1 reseña
                try:
                    user = db_client.users.find_one({"_id": ObjectId(j_id)})
                    if user:
                        promedio = stats["total"] / stats["count"]
                        result.append({
                            "jugador_id": j_id,
                            "promedio": round(promedio, 2),
                            "cantidad": stats["count"],
                            "nombre": user.get("nombre", ""),
                            "apellido": user.get("apellido", ""),
                            "username": user.get("username", "")
                        })
                except:
                    continue
        
        # Ordenar por promedio descendente
        result.sort(key=lambda x: (x["promedio"], x["cantidad"]), reverse=True)
        return result[:limit]
    except Exception as e:
        print("Error en top-jugadores:", e)
        return []

@router.get("/ultimas")
def ultimas_resenias(limit: int = Query(10, ge=1, le=50)):
    try:
        # Obtener últimas reseñas ordenadas por fecha
        resenias = list(db_client.resenias.find({}).sort("fecha", -1).limit(limit))
        
        result = []
        for r in resenias:
            try:
                # Obtener datos del autor (i)
                autor = db_client.users.find_one({"_id": r.get("i")})
                # Obtener datos del destinatario (j)
                destinatario = db_client.users.find_one({"_id": r.get("j")})
                
                if autor and destinatario:
                    result.append({
                        "_id": str(r.get("_id", "")),
                        "numero": r.get("numero", 0),
                        "observacion": r.get("observacion", ""),
                        "fecha": r.get("fecha"),
                        "autor": {
                            "nombre": autor.get("nombre", ""),
                            "apellido": autor.get("apellido", ""),
                            "username": autor.get("username", "")
                        },
                        "destinatario": {
                            "nombre": destinatario.get("nombre", ""),
                            "apellido": destinatario.get("apellido", ""),
                            "username": destinatario.get("username", "")
                        }
                    })
            except:
                continue
        
        return result
    except Exception as e:
        print("Error en ultimas:", e)
        return []

@router.get("/stats")
def mis_resenias_stats(user=Depends(current_user)):
    try:
        user_id = ObjectId(user["id"])
        
        # Contar reseñas recibidas
        resenias = list(db_client.resenias.find({"j": user_id}, {"numero": 1}))
        
        if not resenias:
            return {"promedio": 0.0, "cantidad": 0, "ultimas": []}
        
        # Calcular promedio
        total = sum(r.get("numero", 0) for r in resenias)
        promedio = round(total / len(resenias), 2)
        
        # Obtener últimas 5 reseñas con autor
        ultimas_docs = list(db_client.resenias.find({"j": user_id}).sort("fecha", -1).limit(5))
        ultimas = []
        
        for r in ultimas_docs:
            try:
                autor = db_client.users.find_one({"_id": r.get("i")})
                if autor:
                    ultimas.append({
                        "numero": r.get("numero", 0),
                        "observacion": r.get("observacion", ""),
                        "fecha": r.get("fecha"),
                        "autor": {
                            "nombre": autor.get("nombre", ""),
                            "apellido": autor.get("apellido", ""),
                            "username": autor.get("username", "")
                        }
                    })
            except:
                continue
        
        return {
            "promedio": promedio,
            "cantidad": len(resenias),
            "ultimas": ultimas
        }
    except Exception as e:
        print("Error en stats:", e)
        return {"promedio": 0.0, "cantidad": 0, "ultimas": []}
