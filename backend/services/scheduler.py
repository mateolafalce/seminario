from __future__ import annotations
import os
import time
import traceback
from datetime import datetime, timedelta
from typing import Optional, Callable, Dict, Any
from threading import Lock
from multiprocessing import Process, get_context

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.events import (
    EVENT_JOB_ADDED, EVENT_JOB_EXECUTED, EVENT_JOB_ERROR, EVENT_JOB_MISSED, JobExecutionEvent
)

from db.client import db_client

import pytz

# === Importa tus jobs reales ===
from routers.reservas import cerrar_reservas_vencidas
from services.matcheo import calculate_and_store_relations, optimize_weights
from services.email import notificar_recordatorio
from bson import ObjectId

# =========================
# Config helpers
# =========================
def _env_bool(key: str, default: bool) -> bool:
    return os.getenv(key, str(default)).lower() in {"1", "true", "yes", "y"}

def _env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except Exception:
        return default

# =========================
# Estado y locks
# =========================
_scheduler: Optional[BackgroundScheduler] = None

_lock_close = Lock()
_lock_rel = Lock()
_lock_opt = Lock()

# Estado en memoria
_last: Dict[str, Dict[str, Any]] = {
    "close_reservas": {"start": None, "end": None, "ok": None, "error": None, "duration_s": None, "runs": 0},
    "calc_relations": {"start": None, "end": None, "ok": None, "error": None, "duration_s": None, "runs": 0},
    "optimize_weights": {"start": None, "end": None, "ok": None, "error": None, "duration_s": None, "runs": 0},
}

def _persist_run(name: str, ok: bool, started_at: datetime, duration_s: float, error: Optional[str]):
    try:
        db_client.job_runs.insert_one({
            "name": name,
            "ok": ok,
            "started_at": started_at,
            "ended_at": datetime.utcnow(),
            "duration_s": duration_s,
            "error": error,
        })
    except Exception:
        traceback.print_exc()

def _mark(name: str, ok: bool, start_monotonic: float, err: Optional[str] = None):
    _last[name]["end"] = datetime.utcnow()
    _last[name]["ok"] = ok
    _last[name]["error"] = err
    duration = round(time.monotonic() - start_monotonic, 3)
    _last[name]["duration_s"] = duration
    _last[name]["runs"] = int(_last[name]["runs"] or 0) + 1
    _persist_run(name, ok, _last[name]["start"], duration, err)

def get_last_runs() -> Dict[str, Dict[str, Any]]:
    # útil para endpoint /health si querés exponerlo
    return _last

# =========================
# Runners
# =========================
def _run_in_thread(name: str, lock: Lock, fn: Callable[[], None]):
    if not lock.acquire(blocking=False):
        print(f"[scheduler] {name}: saltado (ya en curso).")
        return
    _last[name]["start"] = datetime.utcnow()
    start_t = time.monotonic()
    _last[name]["error"] = None
    try:
        fn()
        _mark(name, True, start_t)
    except Exception as e:
        traceback.print_exc()
        _mark(name, False, start_t, err=str(e))
    finally:
        lock.release()

_CTX = get_context(os.getenv("MP_START", "fork"))  # en Linux, usa 'fork'; en Windows será 'spawn'

def _run_in_process(name: str, lock: Lock, fn: Callable[[], None], timeout_s: int, retries: int, backoff_s: int):
    """
    Ejecuta en subproceso con timeout y reintentos (backoff exponencial).
    """
    if not lock.acquire(blocking=False):
        print(f"[scheduler] {name}: saltado (ya en curso).")
        return
    _last[name]["start"] = datetime.utcnow()
    _last[name]["error"] = None

    attempt = 0
    try:
        while True:
            attempt += 1
            start_t = time.monotonic()

            # 👇 clave: NO usar funciones anidadas; pasar fn directamente
            p = _CTX.Process(target=fn, daemon=True)
            p.start()
            p.join(timeout=timeout_s)

            if p.is_alive():
                try:
                    p.kill()
                except Exception:
                    pass
                _mark(name, False, start_t, err=f"Timeout {timeout_s}s (attempt {attempt})")
            else:
                ok = (p.exitcode == 0)
                if ok:
                    _mark(name, True, start_t)
                    return
                else:
                    _mark(name, False, start_t, err=f"exitcode={p.exitcode} (attempt {attempt})")

            if attempt > retries:
                return

            sleep_s = backoff_s * (2 ** (attempt - 1))
            print(f"[scheduler] {name}: retry en {sleep_s}s…")
            time.sleep(sleep_s)
    finally:
        lock.release()

# =========================
# Wrappers de tus jobs
# =========================
def job_close_reservas():
    # liviano → thread
    _run_in_thread("close_reservas", _lock_close, cerrar_reservas_vencidas)

def job_calc_relations():
    # pesado → proceso
    _run_in_process(
        "calc_relations",
        _lock_rel,
        calculate_and_store_relations,
        timeout_s=_env_int("REL_TIMEOUT_S", 900),
        retries=_env_int("REL_RETRIES", 1),
        backoff_s=_env_int("REL_BACKOFF_S", 10),
    )

def job_optimize_weights():
    _run_in_process(
        "optimize_weights",
        _lock_opt,
        optimize_weights,
        timeout_s=_env_int("OPT_TIMEOUT_S", 600),
        retries=_env_int("OPT_RETRIES", 1),
        backoff_s=_env_int("OPT_BACKOFF_S", 10),
    )

# =========================
# Event listeners (logs útiles)
# =========================
def _on_job_event(event: JobExecutionEvent):
    try:
        job_id = event.job_id
        if event.code == EVENT_JOB_MISSED:
            print(f"[scheduler] MISSED: {job_id}")
        elif event.code == EVENT_JOB_ERROR:
            print(f"[scheduler] ERROR: {job_id} exc={event.exception}")
        elif event.code == EVENT_JOB_EXECUTED:
            print(f"[scheduler] EXECUTED: {job_id} ({event.scheduled_run_time})")
    except Exception:
        traceback.print_exc()

# =========================
# Arranque / Apagado
# =========================
def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler

    jobstores = {"default": MemoryJobStore()}
    executors = {
        "default": ThreadPoolExecutor(max_workers=_env_int("SCH_THREADS", 4)),
    }
    job_defaults = {
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": _env_int("SCH_MISFIRE_GRACE", 60),
    }

    _scheduler = BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone="UTC",
    )
    _scheduler.start()

    # Frecuencias + jitter (para evitar picos exactos)
    close_m = _env_int("CLOSE_EVERY_MIN", 10)
    rel_m   = _env_int("REL_EVERY_MIN", 30)
    opt_m   = _env_int("OPT_EVERY_MIN", 60)

    _scheduler.add_listener(_on_job_event, EVENT_JOB_ADDED | EVENT_JOB_EXECUTED | EVENT_JOB_ERROR | EVENT_JOB_MISSED)

    _scheduler.add_job(
        job_close_reservas, "interval",
        minutes=close_m,
        id="close_reservas",
        jitter=_env_int("CLOSE_JITTER_S", 15),
        replace_existing=True,
    )
    _scheduler.add_job(
        job_calc_relations, "interval",
        minutes=rel_m,
        id="calc_relations",
        jitter=_env_int("REL_JITTER_S", 30),
        replace_existing=True,
    )
    _scheduler.add_job(
        job_optimize_weights, "interval",
        minutes=opt_m,
        id="optimize_weights",
        jitter=_env_int("OPT_JITTER_S", 30),
        replace_existing=True,
    )

    print(f"[scheduler] iniciado. CLOSE:{close_m}m REL:{rel_m}m OPT:{opt_m}m")
    return _scheduler

def shutdown_scheduler():
    """Detiene el scheduler global de forma segura."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        print("[scheduler] apagado")

ARG_TZ = pytz.timezone(os.getenv("TIMEZONE", "America/Argentina/Buenos_Aires"))
REMINDER_OFFSET_MIN = int(os.getenv("REMINDER_OFFSET_MIN", "60"))

# --- Job simple para enviar recordatorio por reserva ---
def recordatorio_job(reserva_id: str):
    """Envía recordatorio a todos los usuarios de una reserva."""
    print(f"[reminder] ejecutando reserva={reserva_id}")
    try:
        r = db_client.reservas.find_one(
            {"_id": ObjectId(reserva_id)},
            {"fecha": 1, "hora_inicio": 1, "cancha": 1, "usuarios.id": 1}
        )
        if not r:
            print(f"[recordatorio] Reserva {reserva_id} no encontrada")
            return

        h = (db_client.horarios.find_one({"_id": r["hora_inicio"]}, {"hora": 1}) or {}).get("hora", "")
        hora_inicio = h.split("-")[0] if h else ""
        cancha_nombre = (db_client.canchas.find_one({"_id": r["cancha"]}, {"nombre": 1}) or {}).get("nombre", "")

        # mandar a todos los que están en la reserva (recordatorio personal)
        for u in r.get("usuarios", []):
            user_doc = db_client.users.find_one({"_id": u["id"]}, {"persona": 1})
            if not user_doc or not user_doc.get("persona"):
                continue
            p = db_client.personas.find_one({"_id": user_doc["persona"]}, {"email": 1})
            if p and p.get("email"):
                notificar_recordatorio(p["email"], r["fecha"], hora_inicio, cancha_nombre)
                print(f"[recordatorio] Enviado a {p['email']} para reserva {reserva_id}")
    except Exception as e:
        print(f"[recordatorio] Error en job {reserva_id}: {e}")
        traceback.print_exc()

def programar_recordatorio_nueva_reserva(reserva_id: str, fecha: str, hora_inicio_str: str):
    """
    Programa un job único para enviar recordatorio a T - REMINDER_OFFSET_MIN.
    fecha: 'DD-MM-YYYY'
    hora_inicio_str: 'HH:MM'
    """
    dt_slot = ARG_TZ.localize(datetime.strptime(f"{fecha} {hora_inicio_str}", "%d-%m-%Y %H:%M"))
    run_at = dt_slot - timedelta(minutes=REMINDER_OFFSET_MIN)

    # Si ya pasó la hora (por ejemplo, reserva creada dentro del offset),
    # movemos a 10s en el futuro o podés directamente no programar.
    now = datetime.now(ARG_TZ)
    if run_at < now:
        run_at = now + timedelta(seconds=10)

    if not _scheduler:
        start_scheduler()  # por si acaso

    print(f"[reminder] programado reserva={reserva_id} run_at={run_at.isoformat()}")
    
    _scheduler.add_job(
        func=recordatorio_job,
        trigger="date",
        run_date=run_at,
        id=f"reminder:{reserva_id}",
        replace_existing=True,
        kwargs={"reserva_id": reserva_id},
        misfire_grace_time=int(os.getenv("SCH_MISFIRE_GRACE", "60")),
    )
    print(f"[scheduler] Recordatorio programado para {reserva_id} a las {run_at}")

def cancelar_recordatorio_reserva(reserva_id: str):
    """Cancela el recordatorio de una reserva."""
    if _scheduler:
        try:
            _scheduler.remove_job(f"reminder:{reserva_id}")
            print(f"[scheduler] Recordatorio cancelado para {reserva_id}")
        except Exception as e:
            print(f"[scheduler] Error cancelando recordatorio {reserva_id}: {e}")

def cancelar_recordatorio_usuario(reserva_id: str, user_id: str):
    """Placeholder para cancelar recordatorio por usuario (si lo implementás a futuro)."""
    # Por ahora no hacemos nada especial; el recordatorio se cancela por reserva completa
    pass
