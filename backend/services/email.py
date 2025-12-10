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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; text-align">
        <div style="background-color: #000; text-align: center;">
            <h2 style="; color: #eaff00">Habilitación de cuenta</h2>
        </div>
        <p>Para habilitar tu cuenta, hacé clic en el siguiente enlace:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <a href="{url}" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Habilitar cuenta</a>
        </div>
        <p>Si no solicitaste esto, ignorá este correo.</p>
        </div>
    </div>
    """
    return enviar_email(to, subject, html)

def notificar_posible_matcheo(to: str, day: str, hora: str, cancha: str) -> bool:
    dominio = os.getenv("DOMINIO", "")
    subject = f"Posible matcheo para jugar el {day} a las {hora} en la {cancha}"
    url = f"https://{dominio}/reserva?fecha={quote(day)}&cancha={quote(cancha)}&horario={quote(hora)}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; text-align: center;">
            <h2 style="color: #eaff00;">Posible Matcheo Encontrado</h2>
        </div>
        <p>Se ha encontrado un posible matcheo con:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;"><b>Día:</b> {day}</li>
            <li style="margin: 10px 0;"><b>Hora:</b> {hora}</li>
                <li style="margin: 10px 0;"><b>Cancha:</b> {cancha}</li>
            </ul>
        </div>
        <p>Para más información, visitá <a href="{url}">el detalle de la reserva</a>.</p>
    </div>
    """
    return enviar_email(to, subject, html)

def notificar_recordatorio(to: str, day: str, hora: str, cancha: str) -> bool:
    subject = f"Recordatorio de reserva para el {day} a las {hora} en {cancha}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; text-align: center;">
            <h2 style="color: #eaff00;">Recordatorio de Reserva</h2>
        </div>
        <p>Este es un recordatorio de tu reserva:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><b>Día:</b> {day}</li>
                <li style="margin: 10px 0;"><b>Hora:</b> {hora}</li>
                <li style="margin: 10px 0;"><b>Cancha:</b> {cancha}</li>
            </ul>
        </div>
        <p>¡Te esperamos!</p>
    </div>
    """
    return enviar_email(to, subject, html)

def notificar_cancelacion_reserva(to: str, day: str, hora: str, cancha: str, nombre: str, apellido: str) -> bool:
    dominio = os.getenv("DOMINIO", "")
    subject = f"Un usuario canceló su reserva para el {day} a las {hora} en {cancha}"
    url = f"https://{dominio}/reserva?fecha={quote(day)}&cancha={quote(cancha)}&horario={quote(hora)}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; text-align: center;">
            <h2 style="color: #ef4444;">Reserva Cancelada por Usuario</h2>
        </div>
        <p>El jugador {nombre} {apellido} ha cancelado su reserva para:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><b>Día:</b> {day}</li>
                <li style="margin: 10px 0;"><b>Hora:</b> {hora}</li>
                <li style="margin: 10px 0;"><b>Cancha:</b> {cancha}</li>
            </ul>
        </div>
        <p>Podés ver el detalle y cancelar tu reserva si lo deseás en <a href="{url}">este enlace</a>.</p>
    </div>
    """
    return enviar_email(to, subject, html)

def notificar_confirmacion_reserva(to_email: str, fecha: str, hora_inicio: str, cancha_nombre: str):
    """Envía confirmación inmediata al crear/confirmar una reserva."""
    subject = f"Reserva creada para {fecha} {hora_inicio}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; text-align: center;">
            <h2 style="color: #eaff00;">Reserva Confirmada</h2>
        </div>
        <p>¡Listo! Tu reserva fue creada.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><b>Fecha:</b> {fecha}</li>
                <li style="margin: 10px 0;"><b>Hora:</b> {hora_inicio}</li>
                <li style="margin: 10px 0;"><b>Cancha:</b> {cancha_nombre}</li>
            </ul>
        </div>
        <p>Te enviaremos un recordatorio antes del comienzo. ¡Éxitos!</p>
    </div>
    """
    enviar_email(to_email, subject, html)

def notificar_alta_reserva_admin(to: str, day: str, hora: str, cancha: str):
    """
    Notifica al usuario que un administrador creó una reserva a su nombre.
    """
    if not to:
        return False
    
    subject = "Administración registró tu reserva"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; text-align: center;">
            <h2 style="color: #eaff00;">Reserva creada por Administración</h2>
        </div>
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
        <div style="background-color: #000; text-align: center;">
            <h2 style="color: #ef4444;">Reserva cancelada por Administración</h2>
        </div>
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


def notificar_invitacion_partido(
    to: str, 
    nombre_destinatario: str, 
    invitante: str, 
    fecha: str, 
    hora: str, 
    cancha: str
) -> bool:
    """
    Envía una invitación a un jugador para unirse a un partido.
    """
    if not to:
        return False
    
    dominio = os.getenv("DOMINIO", "")
    url = f"https://{dominio}/reserva?fecha={quote(fecha)}&cancha={quote(cancha)}&horario={quote(hora)}"
    
    subject = f"¡{invitante} te invita a jugar el {fecha}!"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; text-align: center; padding: 20px;">
            <h2 style="color: #eaff00; margin: 0;">¡Tenés una invitación para jugar!</h2>
        </div>
        <div style="padding: 20px;">
            <p style="font-size: 16px;">Hola <strong>{nombre_destinatario}</strong>,</p>
            <p style="font-size: 16px;"><strong>{invitante}</strong> te invita a jugar un partido:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin: 12px 0; font-size: 15px;"><b>📅 Fecha:</b> {fecha}</li>
                    <li style="margin: 12px 0; font-size: 15px;"><b>⏰ Hora:</b> {hora}</li>
                    <li style="margin: 12px 0; font-size: 15px;"><b>🎾 Cancha:</b> {cancha}</li>
                </ul>
            </div>
            <div style="text-align: center; margin: 25px 0;">
                <a href="{url}" style="display: inline-block; background-color: #eaff00; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Ver reserva y unirme
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">Si no podés asistir, simplemente ignorá este correo.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">¡Te esperamos en la cancha! 🎾</p>
        </div>
    </div>
    """
    
    try:
        return enviar_email(to=to, subject=subject, html=html)
    except Exception as e:
        print(f"Error enviando invitación a partido: {e}")
        return False