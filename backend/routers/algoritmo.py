from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import require_roles, verify_csrf
import asyncio

# Import robusto, según dónde tengas matcheo.py
try:
    from services.matcheo import (
        get_top_matches_from_db, S, J, get_preference_vector,
        get_user_weights, calculate_and_store_relations, optimize_weights, g
    )
except Exception:
    from matcheo import (
        get_top_matches_from_db, S, J, get_preference_vector,
        get_user_weights, calculate_and_store_relations, optimize_weights, g
    )

router = APIRouter(prefix="/algoritmo", tags=["Algoritmo"])  # <<<<<< ESTA VARIABLE ES CLAVE

def _oid(x: str) -> ObjectId:
    if not ObjectId.is_valid(x):
        raise HTTPException(status_code=400, detail="ID inválido")
    return ObjectId(x)

def _bulk_map(coll, ids, fields=None):
    if not ids:
        return {}
    fields = fields or {}
    cur = coll.find({"_id": {"$in": list(ids)}}, fields)
    return {d["_id"]: d for d in cur}

@router.get("/users", dependencies=[Depends(require_roles("admin"))])
async def list_users(page: int = 1, limit: int = 50) -> Dict[str, Any]:
    if page < 1 or limit < 1 or limit > 200:
        raise HTTPException(status_code=400, detail="Parámetros de paginación inválidos")
    skip = (page - 1) * limit
    proj = {"username": 1, "habilitado": 1, "categoria": 1, "persona": 1}
    total = db_client.users.count_documents({})
    users = list(db_client.users.find({}, proj).skip(skip).limit(limit))

    persona_ids = {u.get("persona") for u in users if u.get("persona")}
    cat_ids = {u.get("categoria") for u in users if u.get("categoria")}
    personas = _bulk_map(db_client.personas, persona_ids, {"nombre": 1, "apellido": 1})
    categorias = _bulk_map(db_client.categorias, cat_ids, {"nombre": 1, "nivel": 1})

    out = []
    for u in users:
        uid = u["_id"]
        p = personas.get(u.get("persona"))
        cat = categorias.get(u.get("categoria"))
        out.append({
            "id": str(uid),
            "username": u.get("username", ""),
            "habilitado": bool(u.get("habilitado", False)),
            "nombre": p.get("nombre") if p else None,
            "apellido": p.get("apellido") if p else None,
            "categoria": ({
                "id": str(cat["_id"]),
                "nombre": cat.get("nombre", ""),
                "nivel": int(cat.get("nivel", 0)),
            } if cat else None),
            "jugados": g(str(uid)),
        })
    return {"page": page, "limit": limit, "total": total, "items": out}

@router.get("/top/{user_id}", dependencies=[Depends(require_roles("admin"))])
async def top_user_matches(
    user_id: str,
    top: int = Query(5, ge=1, le=50),
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="user_id inválido")

    # 1) Intentar por tabla 'pesos'
    raw = get_top_matches_from_db(user_id, top_x=top)

    # 2) Si no alcanza, armar fallback con todos los habilitados (excepto i)
    if len(raw) < top:
        i_oid = ObjectId(user_id)
        extra_ids = [
            str(u["_id"])
            for u in db_client.users.find(
                {"_id": {"$ne": i_oid}, "habilitado": True}, {"_id": 1}
            )
        ]
        # dedupe manteniendo orden: primero los que ya venían de pesos, luego extras
        seen = set(x for x, _ in raw)
        for jid in extra_ids:
            if jid not in seen:
                raw.append((jid, 0.0))
                seen.add(jid)
            if len(raw) >= top:
                break

    items = []
    for j_id, a_saved in raw[:top]:
        # datos de usuario j
        uj = db_client.users.find_one(
            {"_id": ObjectId(j_id)},
            {"username": 1, "persona": 1, "categoria": 1, "habilitado": 1},
        )
        if not uj or not uj.get("habilitado", False):
            continue

        # datos de persona
        persona = None
        if uj.get("persona"):
            persona = db_client.personas.find_one(
                {"_id": uj["persona"]},
                {"nombre": 1, "apellido": 1}
            )

        # nombre de categoría (si existe)
        cat_name = None
        if uj.get("categoria"):
            cat = db_client.categorias.find_one({"_id": uj["categoria"]}, {"nombre": 1})
            if cat:
                cat_name = cat.get("nombre")

        # α/β guardados (o 0.5/0.5 por defecto)
        alpha, beta, a_saved_doc = get_user_weights(user_id, j_id)
        # métrica de similitud y "historial"
        s_val = S(user_id, j_id)
        j_val = J(user_id, j_id)
        a_calc = alpha * s_val + beta * j_val if s_val is not None else j_val

        items.append({
            "j": {
                "id": j_id,
                "username": uj.get("username"),
                "nombre": persona.get("nombre") if persona else None,
                "apellido": persona.get("apellido") if persona else None,
                "categoria": cat_name,
            },
            "scores": {
                "S": float(s_val) if s_val is not None else None,
                "J": float(j_val),
                "alpha": float(alpha),
                "beta": float(beta),
                "A_calc": float(a_calc),
                "A_saved": float(a_saved_doc) if a_saved_doc is not None else float(a_saved),
            },
        })

    # Ordenar por A guardado si existe, si no por A calculado
    def _key(row):
        sc = row["scores"]
        return sc.get("A_saved", 0.0) if sc.get("A_saved", None) is not None else sc.get("A_calc", 0.0)

    items.sort(key=_key, reverse=True)
    items = items[:top]

    return {"user_id": user_id, "top": top, "items": items}

@router.get("/explain/{i_id}/{j_id}", dependencies=[Depends(require_roles("admin"))])
async def explain_pair(i_id: str, j_id: str) -> Dict[str, Any]:
    s = S(i_id, j_id)
    jj = J(i_id, j_id)
    alpha, beta, a_saved = get_user_weights(i_id, j_id)
    a_calc = (1 - beta) * s + beta * jj

    di, hi, ci = get_preference_vector(i_id)
    dj, hj, cj = get_preference_vector(j_id)
    pref_summary = {
        "i": {"dias_count": sum(1 for x in di if x > 0), "horarios_count": sum(1 for x in hi if x > 0), "canchas_count": sum(1 for x in ci if x > 0)},
        "j": {"dias_count": sum(1 for x in dj if x > 0), "horarios_count": sum(1 for x in hj if x > 0), "canchas_count": sum(1 for x in cj if x > 0)},
    }

    def _cat(uid: str):
        u = db_client.users.find_one({"_id": _oid(uid)}, {"categoria": 1})
        if not u or not u.get("categoria"):
            return {"nivel": None, "nombre": None}
        c = db_client.categorias.find_one({"_id": u["categoria"]}, {"nivel": 1, "nombre": 1})
        if not c:
            return {"nivel": None, "nombre": None}
        return {"nivel": int(c.get("nivel", 0)), "nombre": c.get("nombre", "")}

    ci = _cat(i_id)
    cj = _cat(j_id)
    delta_nivel = None
    if ci["nivel"] is not None and cj["nivel"] is not None:
        delta_nivel = abs(ci["nivel"] - cj["nivel"])

    return {
        "i": i_id,
        "j": j_id,
        "scores": {"S": s, "J": jj, "A_saved": a_saved, "A_calc": a_calc, "alpha": alpha, "beta": beta},
        "prefs": pref_summary,
        "categorias": {"i": ci, "j": cj, "delta_nivel": delta_nivel},
    }

@router.post("/recompute", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def recompute_all():
    await asyncio.to_thread(calculate_and_store_relations)
    return {"msg": "Recalculo de relaciones disparado"}

@router.post("/optimize", dependencies=[Depends(require_roles("admin")), Depends(verify_csrf)])
async def optimize_all():
    updated = await asyncio.to_thread(optimize_weights)
    return {"msg": "Optimización de β completada", "updated": len(updated)}
