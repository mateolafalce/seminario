import os
from itertools import combinations
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from collections import defaultdict
import math

from bson import ObjectId

from db.client import db_client

# Esta funcion me indicara a cuantas personas voy a tener
# que notificar. 3/5 seran seleccionados por mayor puntaje resultante de
# la funcion A y el 2/5 restantes seran seleccionados aleatoriamente
# para integrar a los jugadores nuevos al sistema progresivamente
def get_recommendation_split() -> Tuple[int, int]:
    usuarios_a_recomendar = int(os.getenv('USUARIOS_A_RECOMENDAR', 10))
    primer_valor = int((usuarios_a_recomendar * 3) // 5)
    segundo_valor = usuarios_a_recomendar - primer_valor
    return primer_valor, segundo_valor


def gi(user_id_1: str, user_id_2: str) -> int:
    if not ObjectId.is_valid(user_id_1) or not ObjectId.is_valid(user_id_2):
        raise ValueError("IDs de usuario no válidos")
    
    user1_oid = ObjectId(user_id_1)
    user2_oid = ObjectId(user_id_2)
    
    # Buscar reservas donde ambos usuarios estén en la misma cancha, fecha y horario
    pipeline = [
        {
            "$match": {
                "usuario": {"$in": [user1_oid, user2_oid]}
            }
        },
        {
            "$group": {
                "_id": {
                    "cancha": "$cancha",
                    "fecha": "$fecha", 
                    "hora_inicio": "$hora_inicio"
                },
                "usuarios": {"$addToSet": "$usuario"},
                "count": {"$sum": 1}
            }
        },
        {
            "$match": {
                "usuarios": {"$all": [user1_oid, user2_oid]},
                "count": {"$gte": 2}
            }
        },
        {"$count": "partidos_juntos"}
    ]
    
    result = list(db_client.reservas.aggregate(pipeline))
    return result[0]["partidos_juntos"] if result else 0


def g(user_id: str) -> int:
    if not ObjectId.is_valid(user_id):
        raise ValueError("ID de usuario no válido")
    
    user_object_id = ObjectId(user_id)
    # Buscar el estado "Completada" en la colección estadoreserva
    estado_completada = db_client.estadoreserva.find_one({"nombre": "Completada"})
    # Si no existe el estado "Completada", intentar con otros estados que indiquen partidos jugados
    if not estado_completada:
        # Alternativamente, buscar reservas que ya pasaron en el tiempo
        # y que no estén canceladas como aproximación a partidos jugados
        estados_cancelada = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
        
        if estados_cancelada:
            # Contar reservas que no están canceladas y que ya pasaron
            argentina_tz = datetime.now()
            fecha_hoy = argentina_tz.strftime("%d-%m-%Y")
            
            pipeline = [
                {
                    "$match": {
                        "usuario": user_object_id,
                        "estado": {"$ne": estados_cancelada["_id"]}
                    }
                },
                {
                    "$lookup": {
                        "from": "horarios",
                        "localField": "hora_inicio", 
                        "foreignField": "_id",
                        "as": "horario_info"
                    }
                },
                {"$unwind": "$horario_info"},
                {
                    "$addFields": {
                        "fecha_dt": {
                            "$dateFromString": {
                                "dateString": {
                                    "$concat": [
                                        {"$substr": ["$fecha", 6, 4]}, "-",
                                        {"$substr": ["$fecha", 3, 2]}, "-", 
                                        {"$substr": ["$fecha", 0, 2]}
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    "$match": {
                        "fecha_dt": {"$lt": argentina_tz}
                    }
                },
                {"$count": "total_partidos"}
            ]
            
            result = list(db_client.reservas.aggregate(pipeline))
            return result[0]["total_partidos"] if result else 0
        else:
            return db_client.reservas.count_documents({"usuario": user_object_id})
    else:
        return db_client.reservas.count_documents({
            "usuario": user_object_id,
            "estado": estado_completada["_id"]
        })


def get_preference_vector(user_id: str) -> Tuple[List[float], List[float], List[float]]:
    if not ObjectId.is_valid(user_id):
        raise ValueError("ID de usuario no válido")
    
    user_object_id = ObjectId(user_id)
    
    preferencias = list(db_client.preferencias.find({"usuario_id": user_object_id}))
    
    if not preferencias:
        return [], [], []
    
    dias_map = {str(dia["_id"]): idx for idx, dia in enumerate(db_client.dias.find())}
    horarios_map = {str(hora["_id"]): idx for idx, hora in enumerate(db_client.horarios.find())}
    canchas_map = {str(cancha["_id"]): idx for idx, cancha in enumerate(db_client.canchas.find())}
    
    max_dias = len(dias_map)
    max_horarios = len(horarios_map) 
    max_canchas = len(canchas_map)
    
    vector_dias = [0.0] * max_dias
    vector_horarios = [0.0] * max_horarios
    vector_canchas = [0.0] * max_canchas
    
    for pref in preferencias:
        for dia_id in pref.get("dias", []):
            if str(dia_id) in dias_map:
                vector_dias[dias_map[str(dia_id)]] += 1.0
        
        for horario_id in pref.get("horarios", []):
            if str(horario_id) in horarios_map:
                vector_horarios[horarios_map[str(horario_id)]] += 1.0
                
        for cancha_id in pref.get("canchas", []):
            if str(cancha_id) in canchas_map:
                vector_canchas[canchas_map[str(cancha_id)]] += 1.0
    
    total_prefs = len(preferencias)
    if total_prefs > 0:
        vector_dias = [x / total_prefs for x in vector_dias]
        vector_horarios = [x / total_prefs for x in vector_horarios] 
        vector_canchas = [x / total_prefs for x in vector_canchas]
    
    return vector_dias, vector_horarios, vector_canchas


def d(user_id_1: str, user_id_2: str) -> float:
    dias_1, horarios_1, canchas_1 = get_preference_vector(user_id_1)
    dias_2, horarios_2, canchas_2 = get_preference_vector(user_id_2)

    if not dias_1 or not dias_2:
        return float('inf')

    distancia_dias = sum((a - b) ** 2 for a, b in zip(dias_1, dias_2))
    distancia_horarios = sum((a - b) ** 2 for a, b in zip(horarios_1, horarios_2))
    distancia_canchas = sum((a - b) ** 2 for a, b in zip(canchas_1, canchas_2))

    return math.sqrt(distancia_dias + distancia_horarios + distancia_canchas)


def d_max() -> float:
    max_distancia_dias = db_client.dias.count_documents({})
    max_distancia_horarios = db_client.horarios.count_documents({})
    max_distancia_canchas = db_client.canchas.count_documents({})
    return math.sqrt(max_distancia_dias + max_distancia_horarios + max_distancia_canchas)


def S(user_id_1: str, user_id_2: str) -> float:
    distancia = d(user_id_1, user_id_2)
    distancia_maxima = d_max()
    
    if distancia == float('inf') or distancia_maxima == 0:
        return 0.0
    
    return 1 - (distancia / distancia_maxima)


def J(user_id_1: str, user_id_2: str) -> float:
    partidos_juntos = gi(user_id_1, user_id_2)
    total_partidos_user1 = g(user_id_1)
    
    if total_partidos_user1 == 0:
        return 0.0
    
    return partidos_juntos / total_partidos_user1


def A(user_id_1: str, user_id_2: str, alpha: float = 0.5, beta: float = 0.5) -> float:
    if abs(alpha + beta - 1.0) > 1e-6:
        raise ValueError("alpha + beta debe ser igual a 1")
    
    similitud = S(user_id_1, user_id_2)
    historial = J(user_id_1, user_id_2)
    
    return alpha * similitud + beta * historial


def get_top_matches(user_id: str, exclude_user_ids: List[str] = None, top_x: int = 5) -> List[Tuple[str, float]]:
    if exclude_user_ids is None:
        exclude_user_ids = []
    
    exclude_user_ids.append(user_id)
    exclude_object_ids = [ObjectId(uid) for uid in exclude_user_ids if ObjectId.is_valid(uid)]
    
    todos_usuarios = list(db_client.users.find(
        {"_id": {"$nin": exclude_object_ids}, "habilitado": True},
        {"_id": 1}
    ))
    
    matches = []
    for usuario in todos_usuarios:
        other_user_id = str(usuario["_id"])
        score = A(user_id, other_user_id)
        matches.append((other_user_id, score))
    
    matches.sort(key=lambda x: x[1], reverse=True)
    return matches[:top_x]


def get_training_data() -> List[Tuple[str, str, int]]:
    pipeline = [
        {
            "$group": {
                "_id": {
                    "cancha": "$cancha",
                    "fecha": "$fecha", 
                    "hora_inicio": "$hora_inicio"
                },
                "usuarios": {"$addToSet": "$usuario"},
                "count": {"$sum": 1}
            }
        },
        {
            "$match": {
                "count": {"$gte": 2}
            }
        }
    ]
    
    reservas_agrupadas = list(db_client.reservas.aggregate(pipeline))
    
    training_data = []
    all_users = list(db_client.users.find({"habilitado": True}, {"_id": 1}))
    
    for grupo in reservas_agrupadas:
        usuarios_en_partido = grupo["usuarios"]
        for i, user1 in enumerate(usuarios_en_partido):
            for j, user2 in enumerate(usuarios_en_partido):
                if i != j:
                    training_data.append((str(user1), str(user2), 1))
    
    for user1 in all_users:
        for user2 in all_users:
            if user1["_id"] != user2["_id"]:
                pair_exists = any(
                    (str(user1["_id"]), str(user2["_id"]), 1) in training_data or 
                    (str(user2["_id"]), str(user1["_id"]), 1) in training_data
                    for _ in [None]
                )
                if not pair_exists:
                    training_data.append((str(user1["_id"]), str(user2["_id"]), 0))
    
    return training_data


def calculate_loss(beta: float, training_data: List[Tuple[str, str, int]]) -> float:
    alpha = 1 - beta
    total_loss = 0.0
    
    for user1, user2, y_ij in training_data:
        try:
            a_score = A(user1, user2, alpha, beta)
            loss = (a_score - y_ij) ** 2
            total_loss += loss
        except (ValueError, ZeroDivisionError):
            continue
    
    return total_loss / len(training_data) if training_data else 0.0


def calculate_gradient(beta: float, training_data: List[Tuple[str, str, int]]) -> float:
    alpha = 1 - beta
    gradient = 0.0
    
    for user1, user2, y_ij in training_data:
        try:
            s_ij = S(user1, user2)
            j_ij = J(user1, user2)
            a_ij = alpha * s_ij + beta * j_ij
            
            gradient += 2 * (a_ij - y_ij) * (j_ij - s_ij)
        except (ValueError, ZeroDivisionError):
            continue
    
    return gradient / len(training_data) if training_data else 0.0


def optimize_weights(learning_rate: float = 0.1, iterations: int = 100) -> Tuple[float, float]:
    beta = 0.5
    training_data = get_training_data()
    
    if not training_data:
        return 0.5, 0.5
    
    for _ in range(iterations):
        gradient = calculate_gradient(beta, training_data)
        beta = beta - learning_rate * gradient
        
        beta = max(0.0, min(1.0, beta))
    
    alpha = 1 - beta
    return alpha, beta