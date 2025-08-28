import resend
from dotenv import load_dotenv
import os

load_dotenv()

# Con esto se puede enviar mails
# 100/dia
# 3000/mes
# Gratarola 🤠
#
# {"statusCode":403,"error":"You can only send testing 
# emails to your own email address (mateolafalce3@gmail.com). 
# To send emails to other recipients, please verify a domain 
# at resend.com/domains, and change the `from` address to 
# an email using this domain."}. (Domado)
#
# Hay que buscar otro :/
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
    #enviar_email(to, subject, html)

# TODO? actulmente no hay un detalle de la reserva, en caso que lo haya habria
# que modificar esto jiji
def notificar_posible_matcheo(to: str, nombre: str, apellido: str, day: str, hora: str, cancha: str):
    dominio = os.getenv("DOMINIO")
    subject = f"Posible matcheo para el {day} a las {hora} en {cancha}"
    html = f"""
    <p>Se ha encontrado un posible matcheo con:</p>
    <ul>
        <li><strong>Jugador:</strong> {nombre}</li>
        <li><strong>Apellido:</strong> {apellido}</li>
        <li><strong>Día:</strong> {day}</li>
        <li><strong>Hora:</strong> {hora}</li>
        <li><strong>Cancha:</strong> {cancha}</li>
    </ul>
    <p>Para más información, visita <a href="https://{dominio}/reserva">el detalle de las reservas</a>.</p>
    """
    #enviar_email(to, subject, html)