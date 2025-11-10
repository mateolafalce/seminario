import os
import asyncio
from .email import (
    enviar_email,
    enviar_email_habilitacion,
)

async def send_verification_email(email: str, nombre: str, token: str) -> bool:
    """
    Delegamos al helper síncrono que ya arma la URL correcta:
    /api/users_b/habilitar?token=...
    """
    if not os.getenv("RESEND_TOKEN") or not os.getenv("RESEND_EMAIL") or not os.getenv("DOMINIO"):
        raise RuntimeError("Faltan RESEND_TOKEN/RESEND_EMAIL/DOMINIO en entorno")
    ok = await asyncio.to_thread(enviar_email_habilitacion, email, token)
    if not ok:
        raise RuntimeError("enviar_email_habilitacion devolvió False")
    return True

async def send_notification_email(email: str, nombre: str, mensaje: str) -> bool:
    """Envía notificación genérica."""
    try:
        params = {
            "from": os.getenv("RESEND_EMAIL", "noreply@sixtor.site"),
            "to": [email],
            "subject": "Notificación - Boulevard 81",
            "html": f"""
            <h2>Hola {nombre}!</h2>
            <p>{mensaje}</p>
            """
        }
        
        response = resend.Emails.send(params)
        print(f"[EMAIL] Notificación enviada a {email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {email}: {e}")
        return False

def send_verification_email_bg(email: str, nombre: str, token: str) -> None:
    """Adaptador para BackgroundTasks: corre la versión async en su propio event loop."""
    import asyncio
    asyncio.run(send_verification_email(email, nombre, token))
