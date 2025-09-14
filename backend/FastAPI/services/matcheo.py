import os
import math
import random
from datetime import datetime
from typing import List, Dict, Tuple
from collections import defaultdict
from functools import lru_cache

import pytz
from bson import ObjectId
from db.client import db_client
from dotenv import load_dotenv

load_dotenv()

# ==========================
# Config
# ==========================

def get_recommendation_split() -> Tuple[int, int]:
    """3/5 recomendados + 2/5 aleatorios (por env USUARIOS_A_RECOMENDAR)"""
    usuarios_a_recomendar = int(os.getenv("USUARIOS_A_RECOMENDAR", 10))
    top = int((usuarios_a_recomendar * 3) // 5)
    rnd = usuarios_a_recomendar - top
    return top, rnd

# ==========================
# Recomendación (lista de candidatos a notificar)
# ==========================

def a_notificar(usuario_id: str) -> List[str]:
    """Devuelve user_ids: primero mejores matches, luego aleatorios (dedupe)."""
    top, rnd = get_recommendation_split()
    usuarios: List[str] = []

    # top por pesos
    mejores = get_top_matches_from_db(usuario_id, top_x=top)
    usuarios.extend([u for (u, _) in mejores])

    # aleatorios, excluyendo el user y los ya agregados
    excluidos = [usuario_id] + usuarios
    aleatorios = get_random_users(exclude_user_ids=excluidos, count=rnd)
    usuarios.extend(aleatorios)

    # dedupe preservando orden
    seen = set()
    return [u for u in usuarios if not (u in seen or seen.add(u))]

# ==========================
# Métricas de juego (historial)
# ==========================

def gi(user_id_1: str, user_id_2: str) -> int:
    """Partidos confirmados donde i y j jugaron juntos (usuarios.id contiene a ambos)."""
    if not (ObjectId.is_valid(user_id_1) and ObjectId.is_valid(user_id_2)):
        raise ValueError("IDs de usuario no válidos")

    u1 = ObjectId(user_id_1)
    u2 = ObjectId(user_id_2)

    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    match = {"usuarios.id": {"$all": [u1, u2]}}
    if est_conf:
        match["estado"] = est_conf["_id"]

    return db_client.reservas.count_documents(match)


def g(user_id: str) -> int:
    """Partidos confirmados de un usuario (fallback si no está 'Confirmada')."""
    if not ObjectId.is_valid(user_id):
        raise ValueError("ID de usuario no válido")
    user_oid = ObjectId(user_id)

    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if est_conf:
        return db_client.reservas.count_documents({
            "usuarios.id": user_oid,
            "estado": est_conf["_id"]
        })

    # Fallback: cuenta reservas pasadas (no canceladas)
    est_canc = db_client.estadoreserva.find_one({"nombre": "Cancelada"})
    now_ar = datetime.now(pytz.timezone("America/Argentina/Buenos_Aires"))
    match_cond = {"usuarios.id": user_oid}
    if est_canc:
        match_cond["estado"] = {"$ne": est_canc["_id"]}

    pipeline = [
        {"$match": match_cond},
        {"$lookup": {"from": "horarios", "localField": "hora_inicio", "foreignField": "_id", "as": "horario_info"}},
        {"$unwind": "$horario_info"},
        {"$addFields": {
            "fecha_dt": {
                "$dateFromString": {
                    "dateString": {"$concat": [
                        {"$substr": ["$fecha", 6, 4]}, "-",
                        {"$substr": ["$fecha", 3, 2]}, "-",
                        {"$substr": ["$fecha", 0, 2]}
                    ]},
                    "timezone": "America/Argentina/Buenos_Aires"
                }
            }
        }},
        {"$match": {"fecha_dt": {"$lt": now_ar}}},
        {"$count": "total_partidos"}
    ]
    r = list(db_client.reservas.aggregate(pipeline))
    return r[0]["total_partidos"] if r else 0

# ==========================
# Preferencias (vectores)
# ==========================

@lru_cache(maxsize=1)
def get_dias_map() -> Dict[str, int]:
    return {str(d["_id"]): i for i, d in enumerate(db_client.dias.find({}, {"_id": 1}))}

@lru_cache(maxsize=1)
def get_horarios_map() -> Dict[str, int]:
    return {str(h["_id"]): i for i, h in enumerate(db_client.horarios.find({}, {"_id": 1}))}

@lru_cache(maxsize=1)
def get_canchas_map() -> Dict[str, int]:
    return {str(c["_id"]): i for i, c in enumerate(db_client.canchas.find({}, {"_id": 1}))}

def get_preference_vector(user_id: str) -> Tuple[List[float], List[float], List[float]]:
    """Devuelve (vec_dias, vec_horarios, vec_canchas) normalizados."""
    if not ObjectId.is_valid(user_id):
        raise ValueError("ID de usuario no válido")

    prefs = list(db_client.preferencias.find({"usuario_id": ObjectId(user_id)}))
    if not prefs:
        return [], [], []

    dias_map = get_dias_map()
    horarios_map = get_horarios_map()
    canchas_map = get_canchas_map()

    vd = [0.0] * len(dias_map)
    vh = [0.0] * len(horarios_map)
    vc = [0.0] * len(canchas_map)

    for p in prefs:
        for d in p.get("dias", []):
            idx = dias_map.get(str(d)); 
            if idx is not None: vd[idx] += 1.0
        for h in p.get("horarios", []):
            idx = horarios_map.get(str(h));
            if idx is not None: vh[idx] += 1.0
        for c in p.get("canchas", []):
            idx = canchas_map.get(str(c));
            if idx is not None: vc[idx] += 1.0

    n = len(prefs)
    if n > 0:
        vd = [x / n for x in vd]
        vh = [x / n for x in vh]
        vc = [x / n for x in vc]

    return vd, vh, vc

# ==========================
# Distancias / similitudes
# ==========================

def d(user_id_1: str, user_id_2: str) -> float:
    d1, h1, c1 = get_preference_vector(user_id_1)
    d2, h2, c2 = get_preference_vector(user_id_2)

    if not d1 or not d2:
        return float("inf")

    dd = sum((a - b) ** 2 for a, b in zip(d1, d2))
    dh = sum((a - b) ** 2 for a, b in zip(h1, h2))
    dc = sum((a - b) ** 2 for a, b in zip(c1, c2))
    return math.sqrt(dd + dh + dc)

@lru_cache(maxsize=1)
def d_max() -> float:
    """Cota superior simple para normalizar (nº catálogos)."""
    return math.sqrt(
        db_client.dias.count_documents({}) +
        db_client.horarios.count_documents({}) +
        db_client.canchas.count_documents({})
    )

def S(user_id_1: str, user_id_2: str) -> float:
    dist = d(user_id_1, user_id_2)
    dM = d_max()
    if dist == float("inf") or dM == 0:
        return 0.0
    s = 1 - (dist / dM)
    return max(0.0, min(1.0, s))

def J(user_id_1: str, user_id_2: str) -> float:
    """Proporción de partidos de i que fueron con j."""
    gj = gi(user_id_1, user_id_2)
    gi_tot = g(user_id_1)
    return (gj / gi_tot) if gi_tot > 0 else 0.0

def A(user_id_1: str, user_id_2: str, alpha: float = 0.5, beta: float = 0.5) -> float:
    """Score combinado A = α·S + β·J (α+β=1)."""
    if abs(alpha + beta - 1.0) > 1e-6:
        raise ValueError("alpha + beta debe ser igual a 1")
    return alpha * S(user_id_1, user_id_2) + beta * J(user_id_1, user_id_2)

# ==========================
# Pesos (tabla pesos) y top matches
# ==========================

def get_top_matches_from_db(user_id: str, exclude_user_ids: List[str] = None, top_x: int = 50) -> List[Tuple[str, float]]:
    if exclude_user_ids is None:
        exclude_user_ids = []
    if not ObjectId.is_valid(user_id):
        raise ValueError("ID de usuario no válido")

    exclude_copy = exclude_user_ids[:] + [user_id]
    exclude_oids = [ObjectId(u) for u in exclude_copy if ObjectId.is_valid(u)]
    user_oid = ObjectId(user_id)

    pipeline = [
        {"$match": {"i": user_oid, "j": {"$nin": exclude_oids}}},
        {"$sort": {"a": -1}},
        {"$limit": top_x},
        {"$lookup": {
            "from": "users",
            "localField": "j",
            "foreignField": "_id",
            "as": "user_info"
        }},
        {"$unwind": "$user_info"},
        {"$match": {"user_info.habilitado": True}},
        {"$project": {
            "user_id": {"$toString": "$j"},
            "score": "$a",
            "alpha": "$alpha",
            "beta": "$beta"
        }}
    ]
    rows = list(db_client.pesos.aggregate(pipeline))
    return [(r["user_id"], r["score"]) for r in rows]

# ==========================
# Entrenamiento con notif_logs + reservas Confirmadas
# ==========================

def get_training_data_from_logs() -> List[Tuple[str, str, int]]:
    """
    Devuelve triples (i, j, y):
      - y=1 para pares (i,j) que jugaron juntos en reservas Confirmadas.
      - y=1 si i notificó a j (en notif_logs) y j terminó en la reserva Confirmada;
        y=0 si i notificó a j pero j NO terminó en esa reserva (o no fue Confirmada).
    """
    out: set[Tuple[str, str, int]] = set()

    # 1) pares que jugaron juntos (solo Confirmada)
    est_conf = db_client.estadoreserva.find_one({"nombre": "Confirmada"})
    if est_conf:
        rs = db_client.reservas.find({"estado": est_conf["_id"]}, {"usuarios.id": 1})
        for r in rs:
            ids = [str(u["id"]) for u in r.get("usuarios", []) if u.get("id")]
            for idx, ui in enumerate(ids):
                for uj in ids[idx + 1:]:
                    out.add((ui, uj, 1))
                    out.add((uj, ui, 1))

    # 2) logs de notificaciones
    logs = db_client.notif_logs.find({}, {"reserva": 1, "usuario": 1, "origen": 1})
    for l in logs:
        rid = l.get("reserva")
        j = str(l.get("usuario"))
        i = str(l.get("origen"))
        if not (rid and ObjectId.is_valid(j) and ObjectId.is_valid(i)):
            continue

        r = db_client.reservas.find_one({"_id": rid}, {"usuarios.id": 1, "estado": 1})
        if not r:
            continue

        if est_conf and r.get("estado") == est_conf["_id"]:
            users_ids = {str(u["id"]) for u in r.get("usuarios", []) if u.get("id")}
            y = 1 if j in users_ids else 0
        else:
            y = 0
        out.add((i, j, y))

    return list(out)

def calculate_gradient(beta: float, training_data: List[Tuple[str, str, int]]) -> float:
    alpha = 1 - beta
    grad = 0.0
    n = 0
    for i, j, y in training_data:
        try:
            s = S(i, j)
            h = J(i, j)
            a = alpha * s + beta * h
            grad += 2 * (a - y) * (h - s)
            n += 1
        except Exception:
            continue
    return (grad / n) if n else 0.0

def optimize_weights() -> Dict[str, Tuple[float, float]]:
    """
    Optimiza α y β por usuario i usando datos de:
    - pares que jugaron juntos (Confirmada)
    - notif_logs (aciertos/fallos de notificaciones)
    """
    training = get_training_data_from_logs()
    if not training:
        print("No hay datos de entrenamiento disponibles")
        return {}

    # agrupar por i
    user_training: Dict[str, List[Tuple[str, int]]] = defaultdict(list)
    for i, j, y in training:
        user_training[i].append((j, y))

    updated: Dict[str, Tuple[float, float]] = {}
    lr, iters = 0.01, 100

    for i, data in user_training.items():
        if len(data) < 2:
            continue
        # semilla: beta actual si existe
        try:
            _, beta_seed, _ = get_user_weights(i, data[0][0])
        except Exception:
            beta_seed = 0.5
        beta = beta_seed

        for _ in range(iters):
            grad = 0.0
            n = 0
            loss = 0.0
            for j, y in data:
                try:
                    s = S(i, j); h = J(i, j)
                    a = (1 - beta) * s + beta * h
                    err = a - y
                    grad += 2 * err * (h - s)
                    loss += err * err
                    n += 1
                except Exception:
                    continue
            if n == 0:
                break
            grad /= n; loss /= n
            beta = max(0.0, min(1.0, beta - lr * grad))
            if loss < 1e-3:
                break

        alpha = 1 - beta
        for j, _ in data:
            update_user_weights(i, j, alpha, beta)
        updated[i] = (alpha, beta)

    return updated

# ==========================
# Batch para calcular/actualizar A en pesos
# ==========================

def calculate_and_store_relations():
    """
    Recalcula/actualiza A(i,j) para todos los usuarios habilitados:
    usa α/β existentes si hay; si no, 0.5/0.5.
    Optimizado: prefetch α/β por usuario i.
    """
    try:
        habilitados = list(db_client.users.find({"habilitado": True}, {"_id": 1}))
        if len(habilitados) < 2:
            print("No hay suficientes usuarios habilitados para calcular relaciones")
            return

        from pymongo import UpdateOne
        ops = []
        done = 0
        total = len(habilitados) * (len(habilitados) - 1)

        for idx_i, ui in enumerate(habilitados):
            if idx_i % 5 == 0:
                print(f"Procesando {idx_i+1}/{len(habilitados)} - {done}/{total} relaciones")

            # Prefetch α/β para todos los j de este i
            existing = {d["j"]: (d.get("alpha", 0.5), d.get("beta", 0.5))
                        for d in db_client.pesos.find({"i": ui["_id"]}, {"j": 1, "alpha": 1, "beta": 1})}

            for uj in habilitados:
                if ui["_id"] == uj["_id"]:
                    continue

                i_str = str(ui["_id"])
                j_str = str(uj["_id"])

                alpha, beta = existing.get(uj["_id"], (0.5, 0.5))

                try:
                    score = A(i_str, j_str, alpha, beta)
                except Exception:
                    score = 0.0

                ops.append(UpdateOne(
                    {"i": ui["_id"], "j": uj["_id"]},
                    {"$set": {
                        "i": ui["_id"], "j": uj["_id"],
                        "a": score, "alpha": alpha, "beta": beta,
                        "updated_at": datetime.now()
                    }},
                    upsert=True
                ))
                done += 1

                if len(ops) >= 500:
                    db_client.pesos.bulk_write(ops)
                    ops = []
                    print(f"  → Guardadas {done}/{total} relaciones...")

        if ops:
            db_client.pesos.bulk_write(ops)
            print(f"  → Guardadas {done}/{total} relaciones finales...")

        cleanup_disabled_relations()

        print(f"✅ Proceso completado. Se calcularon/actualizaron {done} relaciones.")

    except Exception as e:
        print(f"❌ Error en calculate_and_store_relations: {e}")

def cleanup_disabled_relations():
    """Limpia relaciones en pesos de usuarios no habilitados."""
    try:
        print("🧹 Limpiando relaciones de usuarios deshabilitados...")
        ids_hab = [u["_id"] for u in db_client.users.find({"habilitado": True}, {"_id": 1})]
        res = db_client.pesos.delete_many({
            "$or": [
                {"i": {"$nin": ids_hab}},
                {"j": {"$nin": ids_hab}}
            ]
        })
        print(f"🗑️ Eliminadas {res.deleted_count} relaciones obsoletas")
    except Exception as e:
        print(f"❌ Error en cleanup_disabled_relations: {e}")

# ==========================
# Utilidades varias
# ==========================

def get_random_users(exclude_user_ids: List[str] = None, count: int = 5) -> List[str]:
    """Usuarios habilitados aleatorios excluyendo lista dada."""
    if exclude_user_ids is None:
        exclude_user_ids = []
    exclude_oids = [ObjectId(x) for x in exclude_user_ids if ObjectId.is_valid(x)]

    pipeline = [
        {"$match": {"habilitado": True, "_id": {"$nin": exclude_oids}}},
        {"$sample": {"size": count}},
        {"$project": {"user_id": {"$toString": "$_id"}}}
    ]
    rows = list(db_client.users.aggregate(pipeline))
    return [r["user_id"] for r in rows]

def update_user_weights(user_id_1: str, user_id_2: str, new_alpha: float, new_beta: float) -> bool:
    """Actualiza α/β en pesos para (i=user_id_1, j=user_id_2) y recalcula A."""
    if not (ObjectId.is_valid(user_id_1) and ObjectId.is_valid(user_id_2)):
        raise ValueError("IDs de usuario no válidos")
    if abs(new_alpha + new_beta - 1.0) > 1e-6:
        raise ValueError("alpha + beta debe ser igual a 1")

    try:
        score = A(user_id_1, user_id_2, new_alpha, new_beta)
        result = db_client.pesos.update_one(
            {"i": ObjectId(user_id_1), "j": ObjectId(user_id_2)},
            {"$set": {
                "alpha": new_alpha, "beta": new_beta,
                "a": score, "updated_at": datetime.now()
            }},
            upsert=True
        )
        return bool(result.modified_count or result.upserted_id)
    except Exception as e:
        print(f"Error actualizando pesos {user_id_1}→{user_id_2}: {e}")
        return False

def get_user_weights(user_id_1: str, user_id_2: str) -> Tuple[float, float, float]:
    """Lee α, β y A(i,j) desde pesos; por defecto 0.5/0.5/0.0 si no existe."""
    if not (ObjectId.is_valid(user_id_1) and ObjectId.is_valid(user_id_2)):
        raise ValueError("IDs de usuario no válidos")

    p = db_client.pesos.find_one(
        {"i": ObjectId(user_id_1), "j": ObjectId(user_id_2)},
        {"alpha": 1, "beta": 1, "a": 1}
    )
    if p:
        return float(p.get("alpha", 0.5)), float(p.get("beta", 0.5)), float(p.get("a", 0.0))
    return 0.5, 0.5, 0.0

def invalidate_catalog_caches():
    """Si cambiás catálogos (días/horarios/canchas), podés limpiar caches."""
    get_dias_map.cache_clear()
    get_horarios_map.cache_clear()
    get_canchas_map.cache_clear()
    d_max.cache_clear()