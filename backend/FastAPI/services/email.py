import resend
from dotenv import load_dotenv
import os

load_dotenv()

# Con esto se puede enviar mails
# 100/dia
# 3000/mes
# Gratarola 🤠
#
def enviar_email(to: str, subject: str, html: str):
    resend.api_key = os.getenv("RESEND_TOKEN")
    resend_email = os.getenv("RESEND_EMAIL")
    try:
        resend.Emails.send({
            "from": resend_email,
            "to": to,
            "subject": subject,
            "html": html
        })
    except Exception as e:
        print(f"[ERROR] Falló el envío de email a {to}: {e}")

def enviar_email_habilitacion(to: str, token: str):
    dominio = os.getenv("DOMINIO")
    subject = "Habilitación de cuenta"
    html = f"""
    <p>Para habilitar tu cuenta, hace clic en el siguiente enlace:</p>
    <a href="https://{dominio}/api/users_b/habilitar?token={token}">Habilitar cuenta</a>
    """
    enviar_email(to, subject, html)

def notificar_posible_matcheo(to: str, day: str, hora: str, cancha: str):
    dominio = os.getenv("DOMINIO")
    subject = f"Posible matcheo para jugar el {day} a las {hora} en la {cancha}"
    # para tester http://localhost:8080/reserva?fecha=28-08-2025&cancha=Blindex%20A&horario=21:00-22:30
    url = f"https://{dominio}/reserva?fecha={day}&cancha={cancha}&horario={hora}"
    html = f"""
    <p>Se ha encontrado un posible matcheo con:</p>
    <ul>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    <p>Para más información, visita <a href="{url}">el detalle de la reserva</a>.</p>
    """
    enviar_email(to, subject, html)

def notificar_recordatorio(to: str, day: str, hora: str, cancha: str):
    dominio = os.getenv("DOMINIO")
    subject = f"Recordatorio de reserva para el {day} a las {hora} en {cancha}"
    html = f"""
    <p>Este es un recordatorio de tu reserva:</p>
    <ul>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    """
    enviar_email(to, subject, html)