import resend
from dotenv import load_dotenv
import os
from urllib.parse import quote

load_dotenv()

# Con esto se puede enviar mails
# 100/dia
# 3000/mes
# Gratarola 🤠
def enviar_email(to: str, subject: str, html: str) -> bool:
    resend.api_key = os.getenv("RESEND_TOKEN")
    resend_email = os.getenv("RESEND_EMAIL")

    # Validaciones defensivas
    if not to or "@" not in to:
        print(f"[WARN] No se envía email: 'to' inválido: {to!r}")
        return False
    if not subject or not subject.strip():
        print("[WARN] No se envía email: subject vacío")
        return False
    if not html or not html.strip():
        print("[WARN] No se envía email: html vacío")
        return False
    if not resend_email or not resend_email.strip():
        print("[WARN] No se envía email: RESEND_EMAIL no configurado")
        return False

    try:
        resend.Emails.send({
            "from": resend_email,
            "to": to,
            "subject": subject,
            "html": html
        })
        return True
    except Exception as e:
        print(f"[ERROR] Falló el envío de email a {to}: {e}")
        return False

def enviar_email_habilitacion(to: str, token: str) -> bool:
    dominio = os.getenv("DOMINIO", "")
    subject = "Habilitación de cuenta"
    url = f"https://{dominio}/api/users_b/habilitar?token={quote(token)}"
    html = f"""
    <p>Para habilitar tu cuenta, hacé clic en el siguiente enlace:</p>
    <a href="{url}">Habilitar cuenta</a>
    """
    return enviar_email(to, subject, html)

def notificar_posible_matcheo(to: str, day: str, hora: str, cancha: str) -> bool:
    dominio = os.getenv("DOMINIO", "")
    subject = f"Posible matcheo para jugar el {day} a las {hora} en la {cancha}"
    url = f"https://{dominio}/reserva?fecha={quote(day)}&cancha={quote(cancha)}&horario={quote(hora)}"
    html = f"""
    <p>Se ha encontrado un posible matcheo con:</p>
    <ul>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    <p>Para más información, visitá <a href="{url}">el detalle de la reserva</a>.</p>
    """
    return enviar_email(to, subject, html)

def notificar_recordatorio(to: str, day: str, hora: str, cancha: str) -> bool:
    subject = f"Recordatorio de reserva para el {day} a las {hora} en {cancha}"
    html = f"""
    <p>Este es un recordatorio de tu reserva:</p>
    <ul>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    """
    return enviar_email(to, subject, html)

def notificar_cancelacion_reserva(to: str, day: str, hora: str, cancha: str, nombre: str, apellido: str) -> bool:
    dominio = os.getenv("DOMINIO", "")
    subject = f"Un usuario canceló su reserva para el {day} a las {hora} en {cancha}"
    url = f"https://{dominio}/reserva?fecha={quote(day)}&cancha={quote(cancha)}&horario={quote(hora)}"
    html = f"""
    <p>El jugador {nombre} {apellido} ha cancelado su reserva para:</p>
    <ul>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    <p>Podés ver el detalle y cancelar tu reserva si lo deseás en <a href="{url}">este enlace</a>.</p>
    """
    return enviar_email(to, subject, html)

def notificar_confirmacion_reserva(to_email: str, fecha: str, hora_inicio: str, cancha_nombre: str):
    """Envía confirmación inmediata al crear/confirmar una reserva."""
    subject = f"Reserva creada para {fecha} {hora_inicio}"
    body = (
        f"¡Listo! Tu reserva fue creada.\n\n"
        f"- Fecha: {fecha}\n"
        f"- Hora: {hora_inicio}\n"
        f"- Cancha: {cancha_nombre}\n\n"
        f"Te enviaremos un recordatorio antes del comienzo. ¡Éxitos!"
    )
    enviar_email(to_email, subject, body)

def notificar_alta_reserva_admin(to: str, day: str, hora: str, cancha: str):
    """
    Notifica al usuario que un administrador creó una reserva a su nombre.
    """
    if not to:
        return False
    
    subject = "Administración registró tu reserva"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #eaff00;">Reserva creada por Administración</h2>
        <p>Un administrador registró una reserva a tu nombre.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><b>Día:</b> {day}</li>
                <li style="margin: 10px 0;"><b>Hora:</b> {hora}</li>
                <li style="margin: 10px 0;"><b>Cancha:</b> {cancha}</li>
            </ul>
        </div>
        <p>Recordá confirmar tu asistencia para que la reserva quede confirmada.</p>
        <p>¡Te esperamos!</p>
    </div>
    """
    
    try:
        enviar_email(to=to, subject=subject, html=html)
        return True
    except Exception as e:
        print(f"Error enviando email de alta admin: {e}")
        return False

def notificar_cancelacion_por_admin(to: str, day: str, hora: str, cancha: str):
    """
    Asunto y cuerpo específicos cuando la administración cancela.
    Sin enlaces, solo aviso.
    """
    if not to:
        return False
    
    subject = f"Un administrador canceló tu reserva para el {day} a las {hora} en {cancha}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Reserva cancelada por Administración</h2>
        <p>La administración canceló tu reserva.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><b>Día:</b> {day}</li>
                <li style="margin: 10px 0;"><b>Hora:</b> {hora}</li>
                <li style="margin: 10px 0;"><b>Cancha:</b> {cancha}</li>
            </ul>
        </div>
        <p>Ante cualquier duda, ponete en contacto con recepción.</p>
    </div>
    """
    
    try:
        enviar_email(to=to, subject=subject, html=html)
        return True
    except Exception as e:
        print(f"Error enviando email de cancelación admin: {e}")
        return False