import os
from urllib.parse import quote_plus
import resend
from dotenv import load_dotenv

load_dotenv()

def enviar_email(to: str, subject: str, html: str) -> bool:
    """
    Devuelve True si el envío fue aceptado por la API, False en caso de excepción.
    """
    resend.api_key = os.getenv("RESEND_TOKEN")
    resend_email = os.getenv("RESEND_EMAIL")
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

def _build_detalle_url(dominio: str, day: str, cancha: str, hora: str) -> str:
    # Encode query params
    q_day = quote_plus(day)
    q_cancha = quote_plus(cancha)
    q_hora = quote_plus(hora)
    return f"https://{dominio}/reserva?fecha={q_day}&cancha={q_cancha}&horario={q_hora}"

def enviar_email_habilitacion(to: str, token: str) -> bool:
    dominio = os.getenv("DOMINIO", "")
    subject = "Habilitación de cuenta"
    url = f"https://{dominio}/api/users_b/habilitar?token={quote_plus(token)}"
    html = f"""
    <p>Para habilitar tu cuenta, hacé clic en el siguiente enlace:</p>
    <a href="{url}">Habilitar cuenta</a>
    """
    return enviar_email(to, subject, html)

def notificar_posible_matcheo(to: str, day: str, hora: str, cancha: str) -> bool:
    dominio = os.getenv("DOMINIO", "")
    subject = f"Posible matcheo para jugar el {day} a las {hora} en {cancha}"
    url = _build_detalle_url(dominio, day, cancha, hora)
    html = f"""
    <p>Se ha encontrado un posible matcheo:</p>
    <ul>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    <p>Más info en <a href="{url}">el detalle de la reserva</a>.</p>
    """
    return enviar_email(to, subject, html)

def notificar_recordatorio(to: str, day: str, hora: str, cancha: str) -> bool:
    subject = f"Recordatorio de reserva para el {day} a las {hora} en {cancha}"
    html = f"""
    <p>Recordatorio de tu reserva:</p>
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
    url = _build_detalle_url(dominio, day, cancha, hora)
    html = f"""
    <p>El jugador {nombre} {apellido} canceló su reserva para:</p>
    <ul>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    <p>Ver detalle en <a href="{url}">este enlace</a>.</p>
    """
    return enviar_email(to, subject, html)
