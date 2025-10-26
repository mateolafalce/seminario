from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from db.client import db_client
from routers.Security.auth import current_user, verify_csrf
from db.models.preferencia import PreferenciaCreate
from db.schemas.preferencia import preferencia_schema_ui
from pymongo import ASCENDING


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

# Index recomendado para rendimiento
def ensure_preferencias_indexes():
    db_client.preferencias.create_index([("usuario_id", ASCENDING)], name="preferencias_usuario_id_1")
    db_client.preferencias.create_index([("dias", ASCENDING)],        name="preferencias_dias_1")
    db_client.preferencias.create_index([("horarios", ASCENDING)],    name="preferencias_horarios_1")
    db_client.preferencias.create_index([("canchas", ASCENDING)],     name="preferencias_canchas_1")
