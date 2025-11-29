from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import current_user, verify_csrf, require_roles
from db.models.preferencia import PreferenciaCreate
from db.schemas.preferencia import preferencia_schema_ui
from pymongo import ASCENDING, DESCENDING
from pydantic import BaseModel
import re
import asyncio
from typing import Optional, Dict, Any, List


router = APIRouter(prefix="/preferencias", tags=["Preferencias"])

def _dedupe(seq):
    seen = set()
    out = []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _build_name2oid_maps():
    dias = {d["nombre"]: d["_id"] for d in db_client.dias.find({}, {"nombre": 1})}
    horarios = {h["hora"]: h["_id"] for h in db_client.horarios.find({}, {"hora": 1})}
    canchas = {c["nombre"]: c["_id"] for c in db_client.canchas.find({}, {"nombre": 1})}
    return dias, horarios, canchas


def _build_oid2name_maps():
    dias = {d["_id"]: d["nombre"] for d in db_client.dias.find({}, {"nombre": 1})}
    horarios = {h["_id"]: h["hora"] for h in db_client.horarios.find({}, {"hora": 1})}
    canchas = {c["_id"]: c["nombre"] for c in db_client.canchas.find({}, {"nombre": 1})}
    return dias, horarios, canchas


class AdminBuscarPreferenciasRequest(BaseModel):
    canchas: Optional[List[str]] = None    # 👈 ahora es lista de nombres de cancha
    dias: Optional[List[str]] = None       # ["Lunes", "Miércoles", ...]
    horarios: Optional[List[str]] = None   # ["08:00-09:00", ...]
    page: int = 1
    limit: int = 10


def _validate_and_map_input(preferencias: PreferenciaCreate):
    if not preferencias.dias or not preferencias.horarios or not preferencias.canchas:
        raise HTTPException(status_code=400, detail="Debes elegir al menos un día, un horario y una cancha.")

    dias_map, horarios_map, canchas_map = _build_name2oid_maps()

    dias_nombres = _dedupe(preferencias.dias)
    horarios_nombres = _dedupe(preferencias.horarios)
    canchas_nombres = _dedupe(preferencias.canchas)

    dias_oid, horarios_oid, canchas_oid = [], [], []
    inval_d, inval_h, inval_c = [], [], []

    for d in dias_nombres:
        if d in dias_map:
            dias_oid.append(dias_map[d])
        else:
            inval_d.append(d)
    for h in horarios_nombres:
        if h in horarios_map:
            horarios_oid.append(horarios_map[h])
        else:
            inval_h.append(h)
    for c in canchas_nombres:
        if c in canchas_map:
            canchas_oid.append(canchas_map[c])
        else:
            inval_c.append(c)

    if inval_d or inval_h or inval_c:
        raise HTTPException(status_code=400, detail={
            "dias_invalidos": inval_d, "horarios_invalidos": inval_h, "canchas_invalidas": inval_c
        })

    return dias_oid, horarios_oid, canchas_oid


# --------- Endpoints ---------

@router.post("/guardar",    dependencies=[Depends(verify_csrf)])
async def guardar_preferencias(preferencias: PreferenciaCreate, user: dict = Depends(current_user)):
    if user.get("habilitado") is not True:
        raise HTTPException(status_code=403, detail="Usuario no habilitado para hacer reservas")
    if not user or not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # Límite de 7 docs por usuario
    user_id = ObjectId(user["id"])
    if db_client.preferencias.count_documents({"usuario_id": user_id}) >= 7:
        raise HTTPException(status_code=400, detail="Has alcanzado el límite máximo de 7 preferencias.")

    dias_oid, horarios_oid, canchas_oid = _validate_and_map_input(preferencias)

    db_client.preferencias.insert_one({
        "usuario_id": user_id,
        "dias": dias_oid,
        "horarios": horarios_oid,
        "canchas": canchas_oid
    })
    return {"msg": "Preferencias guardadas con éxito"}


@router.get("/obtener")
async def obtener_preferencias(user: dict = Depends(current_user)):
    if user.get("habilitado") is not True:
        raise HTTPException(status_code=403, detail="Usuario no habilitado para hacer reservas")
    if not user or not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # Cargar todas las etiquetas una sola vez (más eficiente)
    d_map, h_map, c_map = _build_oid2name_maps()

    cursor = db_client.preferencias.find({"usuario_id": ObjectId(user["id"])})
    out = [preferencia_schema_ui(p, d_map, h_map, c_map) for p in cursor]
    return out


@router.put("/modificar/{preferencia_id}", dependencies=[Depends(verify_csrf)])
async def modificar_preferencia(preferencia_id: str, preferencias: PreferenciaCreate, user: dict = Depends(current_user)):
    if not ObjectId.is_valid(preferencia_id):
        raise HTTPException(status_code=400, detail="ID de preferencia inválido")
    if not user or not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    pref_oid = ObjectId(preferencia_id)
    # Verificar ownership
    if not db_client.preferencias.find_one({"_id": pref_oid, "usuario_id": ObjectId(user["id"])}):
        raise HTTPException(status_code=404, detail="Preferencia no encontrada o sin permiso para modificar")

    dias_oid, horarios_oid, canchas_oid = _validate_and_map_input(preferencias)

    db_client.preferencias.update_one(
        {"_id": pref_oid},
        {"$set": {"dias": dias_oid, "horarios": horarios_oid, "canchas": canchas_oid}}
    )
    return {"msg": "Preferencia actualizada con éxito"}


@router.delete("/eliminar/{preferencia_id}", dependencies=[Depends(verify_csrf)])
async def eliminar_preferencia(preferencia_id: str, user: dict = Depends(current_user)):
    if not ObjectId.is_valid(preferencia_id):
        raise HTTPException(status_code=400, detail="ID de preferencia inválido")
    if not user or not user.get("id") or not ObjectId.is_valid(user["id"]):
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    pref_oid = ObjectId(preferencia_id)
    if not db_client.preferencias.find_one({"_id": pref_oid, "usuario_id": ObjectId(user["id"])}):
        raise HTTPException(status_code=404, detail="Preferencia no encontrada o sin permiso para eliminar")

    res = db_client.preferencias.delete_one({"_id": pref_oid})
    if res.deleted_count != 1:
        raise HTTPException(status_code=500, detail="Error al eliminar la preferencia")
    return {"msg": "Preferencia eliminada con éxito"}


@router.post(
    "/admin/buscar",
    dependencies=[Depends(verify_csrf), Depends(require_roles("admin"))],
)
async def admin_buscar_preferencias(payload: AdminBuscarPreferenciasRequest):
    """
    Búsqueda de preferencias para el panel admin:

    - Filtra por 0..N días (dias: ["Lunes", "Miércoles", ...])
    - Filtra por 0..N horarios (horarios: ["08:00-09:00", ...])
    - Filtra por 0..N canchas (canchas: ["Cancha 1", ...])
    - Devuelve además datos del usuario: username, nombre, apellido, dni
    """

    # Normalizar paginación
    try:
        page = int(payload.page or 1)
    except Exception:
        page = 1
    page = max(1, page)

    try:
        limit = int(payload.limit or 10)
    except Exception:
        limit = 10
    limit = max(1, min(100, limit))

    # Mapas nombre -> ObjectId y ObjectId -> nombre
    dias_name2id, horarios_name2id, canchas_name2id = _build_name2oid_maps()
    dias_id2name, horarios_id2name, canchas_id2name = _build_oid2name_maps()

    filtros: Dict[str, Any] = {}

    # --- FILTRO DÍAS (0..N) ---
    if payload.dias:
        dias_ids = [dias_name2id[d] for d in payload.dias if d in dias_name2id]
        if not dias_ids:
            # si no matchea ningún día, devolvemos vacío directo
            return {"page": page, "limit": limit, "total": 0, "preferencias": []}
        filtros["dias"] = {"$in": dias_ids}

    # --- FILTRO HORARIOS (0..N) ---
    if payload.horarios:
        horarios_ids = [
            horarios_name2id[h] for h in payload.horarios if h in horarios_name2id
        ]
        if not horarios_ids:
            return {"page": page, "limit": limit, "total": 0, "preferencias": []}
        filtros["horarios"] = {"$in": horarios_ids}

    # --- FILTRO CANCHAS (0..N) ---
    if payload.canchas:
        cancha_ids = [
            canchas_name2id[nombre]
            for nombre in payload.canchas
            if nombre in canchas_name2id
        ]
        if not cancha_ids:
            return {"page": page, "limit": limit, "total": 0, "preferencias": []}
        filtros["canchas"] = {"$in": cancha_ids}

    total = db_client.preferencias.count_documents(filtros)

    cursor = (
        db_client.preferencias
        .find(filtros)
        .sort("_id", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    filas: List[Dict[str, Any]] = []

    for doc in cursor:
        # pref_ui: id, dias, horarios, canchas -> ya en texto
        pref_ui = preferencia_schema_ui(
            doc, dias_id2name, horarios_id2name, canchas_id2name
        )

        usuario_id = doc.get("usuario_id")
        usuario_username = ""
        usuario_nombre = ""
        usuario_apellido = ""
        usuario_dni = ""

        if usuario_id:
            user_doc = db_client.users.find_one(
                {"_id": usuario_id},
                {"username": 1, "persona": 1, "nombre": 1, "apellido": 1, "dni": 1},
            )

            persona_doc = None
            if user_doc and user_doc.get("persona"):
                persona_doc = db_client.personas.find_one(
                    {"_id": user_doc["persona"]},
                    {"nombre": 1, "apellido": 1, "dni": 1},
                )

            if user_doc:
                usuario_username = user_doc.get("username") or ""
                usuario_nombre = (persona_doc or {}).get("nombre") or user_doc.get("nombre") or ""
                usuario_apellido = (persona_doc or {}).get("apellido") or user_doc.get("apellido") or ""
                usuario_dni = (persona_doc or {}).get("dni") or user_doc.get("dni") or ""

        fila = {
            **pref_ui,
            "usuario_id": str(usuario_id) if isinstance(usuario_id, ObjectId) else (usuario_id or None),
            "usuario_username": usuario_username,
            "usuario_nombre": usuario_nombre,
            "usuario_apellido": usuario_apellido,
            "usuario_dni": usuario_dni,
        }

        filas.append(fila)

    # Helper para limpiar ObjectId sueltos
    def _to_str(value):
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, list):
            return [_to_str(v) for v in value]
        if isinstance(value, dict):
            return {k: _to_str(v) for k, v in value.items()}
        return value

    filas = [_to_str(f) for f in filas]

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "preferencias": filas,
    }

# Index recomendado para rendimiento
def ensure_preferencias_indexes():
    db_client.preferencias.create_index([("usuario_id", ASCENDING)], name="preferencias_usuario_id_1")
    db_client.preferencias.create_index([("dias", ASCENDING)],        name="preferencias_dias_1")
    db_client.preferencias.create_index([("horarios", ASCENDING)],    name="preferencias_horarios_1")
    db_client.preferencias.create_index([("canchas", ASCENDING)],     name="preferencias_canchas_1")
