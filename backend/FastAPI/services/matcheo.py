import os
from itertools import combinations
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from collections import defaultdict
import math
import random

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

def a_notificar(usuario_id: str) -> List[str]:
    primer_valor, segundo_valor = get_recommendation_split()
    usuarios_a_notificar = []
    
    # Obtener los mejores matches usando la tabla pesos
    mejores_matches = get_top_matches_from_db(usuario_id, top_x=primer_valor)
    usuarios_a_notificar.extend([match[0] for match in mejores_matches])
    
    # Seleccionar aleatoriamente usuarios para el segundo grupo
    # Excluir usuarios ya seleccionados y el usuario actual
    usuarios_excluidos = [usuario_id] + usuarios_a_notificar
    usuarios_aleatorios = get_random_users(exclude_user_ids=usuarios_excluidos, count=segundo_valor)
    usuarios_a_notificar.extend(usuarios_aleatorios)

    return usuarios_a_notificar

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

def get_top_matches_from_db(user_id: str, exclude_user_ids: List[str] = None, top_x: int = 50) -> List[Tuple[str, float]]:
    """
    Obtiene los mejores matches usando las relaciones pre-calculadas en la tabla pesos
    """
    if exclude_user_ids is None:
        exclude_user_ids = []
    
    # Crear una copia para no modificar la lista original
    exclude_copy = exclude_user_ids.copy()
    exclude_copy.append(user_id)
    exclude_object_ids = [ObjectId(uid) for uid in exclude_copy if ObjectId.is_valid(uid)]
    
    if not ObjectId.is_valid(user_id):
        raise ValueError("ID de usuario no válido")
    
    user_oid = ObjectId(user_id)
    
    pipeline = [
        {"$match": {"i": user_oid, "j": {"$nin": exclude_object_ids}}},
        {"$sort": {"a": -1}},
        {"$limit": top_x},
        {
            "$lookup": {
                "from": "users",
                "localField": "j",
                "foreignField": "_id", 
                "as": "user_info"
            }
        },
        {"$unwind": "$user_info"},
        {"$match": {"user_info.habilitado": True}},
        {
            "$project": {
                "user_id": {"$toString": "$j"},
                "score": "$a",
                "alpha": "$alpha",
                "beta": "$beta"
            }
        }
    ]
    
    pesos = list(db_client.pesos.aggregate(pipeline))
    
    return [(peso["user_id"], peso["score"]) for peso in pesos]


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
                    (str(user2["_Id"]), str(user1["_id"]), 1) in training_data
                    for _ in [None]
                )
                if not pair_exists:
                    training_data.append((str(user1["_id"]), str(user2["_id"]), 0))
    
    return training_data


def get_training_data_from_completed_reservations() -> List[Tuple[str, str, int]]:
    """
    Obtiene datos de entrenamiento basados en reservas completadas y sus notificaciones
    """
    estado_completada = db_client.estadoreserva.find_one({"nombre": "Completada"})
    if not estado_completada:
        return []
    
    # Pipeline para obtener reservas completadas con sus notificaciones
    pipeline = [
        {"$match": {"estado": estado_completada["_id"], "notificacion_id": {"$ne": None}}},
        {
            "$lookup": {
                "from": "notificaciones",
                "localField": "notificacion_id",
                "foreignField": "_id",
                "as": "notificacion_info"
            }
        },
        {"$unwind": "$notificacion_info"},
        {
            "$group": {
                "_id": {
                    "cancha": "$cancha",
                    "fecha": "$fecha", 
                    "hora_inicio": "$hora_inicio"
                },
                "usuarios": {"$addToSet": "$usuario"},
                "notificaciones": {"$addToSet": "$notificacion_info"}
            }
        },
        {
            "$match": {
                "$expr": {"$gte": [{"$size": "$usuarios"}, 2]}
            }
        }
    ]
    
    reservas_completadas = list(db_client.reservas.aggregate(pipeline))
    training_data = []
    
    for grupo in reservas_completadas:
        usuarios_en_partido = grupo["usuarios"]
        notificaciones = grupo["notificaciones"]
        
        # Para cada notificación en este partido
        for notif in notificaciones:
            usuario_i = str(notif["i"])  # Usuario que hizo la reserva
            usuarios_j = [str(j_id) for j_id in notif["j"]]  # Usuarios notificados
            
            # Para cada usuario que efectivamente jugó en este partido
            for usuario_en_partido in usuarios_en_partido:
                usuario_en_partido_str = str(usuario_en_partido)
                
                if usuario_en_partido_str != usuario_i:  # No comparar consigo mismo
                    # Si el usuario que jugó estaba en la lista de notificados (j), label = 1
                    if usuario_en_partido_str in usuarios_j:
                        training_data.append((usuario_i, usuario_en_partido_str, 1))
                    
                    # Para los usuarios notificados que NO jugaron, label = 0
                    for usuario_j in usuarios_j:
                        if usuario_j not in [str(u) for u in usuarios_en_partido]:
                            training_data.append((usuario_i, usuario_j, 0))
    
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


def optimize_weights() -> Tuple[float, float]:
    learning_rate = 0.1
    beta = 0.5
    
    if not training_data:
        return 0.5, 0.5
    
    for _ in range(iterations):
        gradient = calculate_gradient(beta, training_data)
        beta = beta - learning_rate * gradient
        
        beta = max(0.0, min(1.0, beta))
    
    alpha = 1 - beta
    return alpha, beta


def optimize_weights() -> Dict[str, Tuple[float, float]]:
    """
    Optimiza los pesos alpha y beta para cada usuario basado en datos de reservas completadas
    usando backpropagation
    """
    training_data = get_training_data_from_completed_reservations()
    
    if not training_data:
        print("No hay datos de entrenamiento disponibles")
        return {}
    
    print(f"Optimizando pesos con {len(training_data)} ejemplos de entrenamiento...")
    
    # Agrupar datos por usuario i (quien hizo la reserva)
    user_training_data = defaultdict(list)
    for user_i, user_j, label in training_data:
        user_training_data[user_i].append((user_j, label))
    
    updated_weights = {}
    learning_rate = 0.01
    iterations = 100
    
    for user_i, user_data in user_training_data.items():
        if len(user_data) < 2:  # Necesitamos al menos 2 ejemplos para entrenar
            continue
            
        try:
            # Obtener pesos actuales o usar valores por defecto
            current_alpha, current_beta, _ = get_user_weights(user_i, user_data[0][0])
            beta = current_beta
            
            # Optimización usando gradient descent
            for iteration in range(iterations):
                gradient = 0.0
                total_loss = 0.0
                
                for user_j, y_ij in user_data:
                    try:
                        alpha = 1 - beta
                        s_ij = S(user_i, user_j)
                        j_ij = J(user_i, user_j)
                        a_ij = alpha * s_ij + beta * j_ij
                        
                        # Calcular gradiente: ∂L/∂β = 2(A(i,j) - y_ij)(J(i,j) - S(i,j))
                        error = a_ij - y_ij
                        gradient += 2 * error * (j_ij - s_ij)
                        total_loss += error ** 2
                        
                    except (ValueError, ZeroDivisionError):
                        continue
                
                if len(user_data) > 0:
                    gradient /= len(user_data)
                    total_loss /= len(user_data)
                
                # Actualizar beta
                beta = beta - learning_rate * gradient
                
                # Mantener beta en el rango [0, 1]
                beta = max(0.0, min(1.0, beta))
                
                # Early stopping si la pérdida es muy pequeña
                if total_loss < 0.001:
                    break
            
            new_alpha = 1 - beta
            new_beta = beta
            
            # Actualizar pesos para todas las relaciones de este usuario
            for user_j, _ in user_data:
                update_user_weights(user_i, user_j, new_alpha, new_beta)
            
            updated_weights[user_i] = (new_alpha, new_beta)
            print(f"Usuario {user_i}: α={new_alpha:.3f}, β={new_beta:.3f}")
            
        except Exception as e:
            print(f"Error optimizando pesos para usuario {user_i}: {e}")
            continue
    
    print(f"✅ Optimización completada. Se actualizaron pesos para {len(updated_weights)} usuarios.")
    return updated_weights


def train_model_with_feedback(pares_feedback: Dict[Tuple[str, str], int]):
    updated_weights = {}
    learning_rate = 0.01
    iterations = 1
    
    for (usuario_i, usuario_j), feedback in pares_feedback.items():
        try:
            # Obtener pesos actuales
            current_alpha, current_beta, _ = get_user_weights(usuario_i, usuario_j)
            beta = current_beta
            
            print(f"👥 Par {usuario_i[:8]}.../{usuario_j[:8]}... - Feedback: {feedback}")
            print(f"   🎯 Pesos actuales: α={current_alpha:.3f}, β={current_beta:.3f}")
            
            # Crear datos de entrenamiento para este par
            # Si feedback > 0, significa que la predicción fue acertada (y_ij = 1)
            # Si feedback = 0, la predicción falló (y_ij = 0)
            y_ij = 1 if feedback > 0 else 0
            
            # Optimización usando gradient descent
            for iteration in range(iterations):
                try:
                    alpha = 1 - beta
                    s_ij = S(usuario_i, usuario_j)
                    j_ij = J(usuario_i, usuario_j)
                    a_ij = alpha * s_ij + beta * j_ij
                    
                    # Calcular gradiente: ∂L/∂β = 2(A(i,j) - y_ij)(J(i,j) - S(i,j))
                    error = a_ij - y_ij
                    gradient = 2 * error * (j_ij - s_ij)
                    
                    # Actualizar beta
                    beta = beta - learning_rate * gradient
                    
                    # Mantener beta en el rango [0, 1]
                    beta = max(0.0, min(1.0, beta))
                    
                    # Early stopping si el error es muy pequeño
                    if abs(error) < 0.01:
                        break
                        
                except (ValueError, ZeroDivisionError) as e:
                    print(f"   ⚠️ Error en iteración {iteration}: {e}")
                    break
            
            new_alpha = 1 - beta
            new_beta = beta
            
            # Actualizar pesos en la base de datos
            if update_user_weights(usuario_i, usuario_j, new_alpha, new_beta):
                updated_weights[(usuario_i, usuario_j)] = (new_alpha, new_beta)
                print(f"   ✅ Pesos actualizados: α={new_alpha:.3f}, β={new_beta:.3f}")
                
                # Si el feedback fue positivo, fortalecer la relación inversa también
                if feedback > 0:
                    if update_user_weights(usuario_j, usuario_i, new_alpha, new_beta):
                        updated_weights[(usuario_j, usuario_i)] = (new_alpha, new_beta)
                        print(f"   🔄 Relación inversa también actualizada")
            else:
                print(f"   ❌ Error actualizando pesos en BD")
                
        except Exception as e:
            print(f"❌ Error entrenando par {usuario_i[:8]}.../{usuario_j[:8]}...: {e}")
            continue
    
    print(f"✅ Entrenamiento completado. Se actualizaron {len(updated_weights)} relaciones.")
    return updated_weights


def train_model_with_feedback_optimized(pares_feedback: Dict[Tuple[str, str], int]):
    for (usuario_i, usuario_j), feedback in pares_feedback.items():
        try:
            s_ij = S(usuario_i, usuario_j)
            j_ij = J(usuario_i, usuario_j)
            y_ij = 1 if feedback > 0 else 0
            
            # Solución analítica para minimizar (α*S + β*J - y)²
            # donde α + β = 1, entonces α = 1 - β
            # Minimizar: ((1-β)*S + β*J - y)² respecto a β
            
            if abs(j_ij - s_ij) > 1e-6:  # Evitar división por cero
                # Derivada = 0: β_optimal = (y - S) / (J - S)
                beta_optimal = (y_ij - s_ij) / (j_ij - s_ij)
                beta_optimal = max(0.0, min(1.0, beta_optimal))  # Clamp [0,1]
                alpha_optimal = 1 - beta_optimal
                
                update_user_weights(usuario_i, usuario_j, alpha_optimal, beta_optimal)
            
        except Exception as e:
            print(f"Error: {e}")
            continue


def calculate_and_store_relations():
    """
    Calcula y almacena/actualiza las relaciones A entre todos los usuarios habilitados
    en la colección 'pesos' de la base de datos.
    Si no existe una relación previa, usa alpha=0.5 y beta=0.5 por defecto.
    """
    try:
        usuarios_habilitados = list(db_client.users.find(
            {"habilitado": True}, 
            {"_id": 1}
        ))
        
        if len(usuarios_habilitados) < 2:
            print("No hay suficientes usuarios habilitados para calcular relaciones")
            return
        
        print(f"Calculando relaciones para {len(usuarios_habilitados)} usuarios...")
        
        relaciones_calculadas = 0
        total_relaciones = len(usuarios_habilitados) * (len(usuarios_habilitados) - 1)
        
        # Preparar operaciones de bulk insert/update para mejor rendimiento
        bulk_operations = []
        
        for i, user_i in enumerate(usuarios_habilitados):
            if i % 5 == 0:  # Progreso cada 5 usuarios
                print(f"Procesando usuario {i+1}/{len(usuarios_habilitados)} - {relaciones_calculadas}/{total_relaciones} relaciones procesadas")
            
            for j, user_j in enumerate(usuarios_habilitados):
                if i != j:  # No calcular la relación de un usuario consigo mismo
                    user_i_str = str(user_i["_id"])
                    user_j_str = str(user_j["_id"])
                    
                    try:
                        # Buscar si ya existe una relación previa para obtener alpha y beta
                        peso_existente = db_client.pesos.find_one({
                            "i": user_i["_id"],
                            "j": user_j["_id"]
                        })
                        
                        # Si existe, usar sus valores alpha y beta, sino usar valores por defecto
                        if peso_existente and "alpha" in peso_existente and "beta" in peso_existente:
                            alpha = peso_existente["alpha"]
                            beta = peso_existente["beta"]
                        else:
                            alpha = 0.5
                            beta = 0.5
                        
                        # Calcular score usando los pesos determinados
                        score_a = A(user_i_str, user_j_str, alpha, beta)
                        
                        # Preparar operación de upsert
                        bulk_operations.append({
                            "filter": {
                                "i": user_i["_id"],
                                "j": user_j["_id"],
                            },
                            "update": {
                                "$set": {
                                    "i": user_i["_id"],
                                    "j": user_j["_id"],
                                    "a": score_a,
                                    "alpha": alpha,
                                    "beta": beta,
                                    "updated_at": datetime.now()
                                }
                            },
                            "upsert": True
                        })
                        
                        relaciones_calculadas += 1
                        
                        # Ejecutar operaciones en lotes para mejor rendimiento
                        if len(bulk_operations) >= 500:  # Procesar en lotes de 500
                            execute_bulk_operations(bulk_operations)
                            bulk_operations = []
                            print(f"  → Guardadas {relaciones_calculadas}/{total_relaciones} relaciones...")
                            
                    except Exception as e:
                        print(f"Error calculando relación entre {user_i_str} y {user_j_str}: {e}")
                        continue
        
        # Ejecutar operaciones restantes
        if bulk_operations:
            execute_bulk_operations(bulk_operations)
            print(f"  → Guardadas {relaciones_calculadas}/{total_relaciones} relaciones finales...")
        
        print(f"✅ Proceso completado. Se calcularon/actualizaron {relaciones_calculadas} relaciones.")
        
        # Opcional: limpiar relaciones de usuarios que ya no están habilitados
        cleanup_disabled_relations()
        
    except Exception as e:
        print(f"❌ Error en calculate_and_store_relations: {e}")


def execute_bulk_operations(bulk_operations):
    """
    Ejecuta operaciones de bulk update de manera eficiente en la tabla pesos
    """
    try:
        from pymongo import UpdateOne
        
        # Convertir a operaciones de UpdateOne para PyMongo
        update_operations = []
        for op in bulk_operations:
            update_operations.append(
                UpdateOne(
                    op["filter"],
                    op["update"],
                    upsert=op["upsert"]
                )
            )
        
        # Ejecutar todas las operaciones en una sola llamada en la tabla pesos
        if update_operations:
            result = db_client.pesos.bulk_write(update_operations)
            return result
            
    except Exception as e:
        print(f"Error en execute_bulk_operations: {e}")
        # Fallback a operaciones individuales si falla el bulk
        for op in bulk_operations:
            try:
                db_client.pesos.update_one(
                    op["filter"],
                    op["update"],
                    upsert=op["upsert"]
                )
            except Exception as individual_error:
                print(f"Error en operación individual: {individual_error}")


def cleanup_disabled_relations():
    """
    Elimina relaciones de usuarios que ya no están habilitados de la tabla pesos
    """
    try:
        print("🧹 Limpiando relaciones de usuarios deshabilitados...")
        
        # Obtener IDs de usuarios habilitados
        usuarios_habilitados_ids = [
            user["_id"] for user in db_client.users.find({"habilitado": True}, {"_id": 1})
        ]
        
        # Eliminar relaciones donde 'i' o 'j' no están en la lista de usuarios habilitados
        result = db_client.pesos.delete_many({
            "$or": [
                {"i": {"$nin": usuarios_habilitados_ids}},
                {"j": {"$nin": usuarios_habilitados_ids}}
            ]
        })
        
        print(f"🗑️ Eliminadas {result.deleted_count} relaciones obsoletas de la tabla pesos")
        
    except Exception as e:
        print(f"❌ Error en cleanup_disabled_relations: {e}")


def get_random_users(exclude_user_ids: List[str] = None, count: int = 5) -> List[str]:
    """
    Obtiene usuarios aleatorios habilitados excluyendo los IDs especificados
    """
    if exclude_user_ids is None:
        exclude_user_ids = []
    
    exclude_object_ids = [ObjectId(uid) for uid in exclude_user_ids if ObjectId.is_valid(uid)]
    
    # Pipeline para obtener usuarios aleatorios habilitados
    pipeline = [
        {
            "$match": {
                "habilitado": True,
                "_id": {"$nin": exclude_object_ids}
            }
        },
        {"$sample": {"size": count}},
        {
            "$project": {
                "user_id": {"$toString": "$_id"}
            }
        }
    ]
    
    usuarios = list(db_client.users.aggregate(pipeline))
    return [usuario["user_id"] for usuario in usuarios]


def update_user_weights(user_id_1: str, user_id_2: str, new_alpha: float, new_beta: float):
    """
    Actualiza los pesos alpha y beta para una relación específica en la tabla pesos
    """
    if not ObjectId.is_valid(user_id_1) or not ObjectId.is_valid(user_id_2):
        raise ValueError("IDs de usuario no válidos")
    
    if abs(new_alpha + new_beta - 1.0) > 1e-6:
        raise ValueError("alpha + beta debe ser igual a 1")
    
    user1_oid = ObjectId(user_id_1)
    user2_oid = ObjectId(user_id_2)
    
    try:
        # Recalcular el score A con los nuevos pesos
        score_a = A(user_id_1, user_id_2, new_alpha, new_beta)
        
        # Actualizar en la tabla pesos
        result = db_client.pesos.update_one(
            {
                "i": user1_oid,
                "j": user2_oid
            },
            {
                "$set": {
                    "alpha": new_alpha,
                    "beta": new_beta,
                    "a": score_a,
                    "updated_at": datetime.now()
                }
            },
            upsert=True
        )
        
        return result.modified_count > 0 or result.upserted_id is not None
        
    except Exception as e:
        print(f"Error actualizando pesos para usuarios {user_id_1} y {user_id_2}: {e}")
        return False


def get_user_weights(user_id_1: str, user_id_2: str) -> Tuple[float, float, float]:
    """
    Obtiene los pesos alpha, beta y score A para una relación específica desde la tabla pesos
    """
    if not ObjectId.is_valid(user_id_1) or not ObjectId.is_valid(user_id_2):
        raise ValueError("IDs de usuario no válidos")
    
    user1_oid = ObjectId(user_id_1)
    user2_oid = ObjectId(user_id_2)
    
    peso = db_client.pesos.find_one({
        "i": user1_oid,
        "j": user2_oid
    })
    
    if peso:
        return peso.get("alpha", 0.5), peso.get("beta", 0.5), peso.get("a", 0.0)
    else:
        # Si no existe, devolver valores por defecto
        return 0.5, 0.5, 0.0