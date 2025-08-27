import resend
from dotenv import load_dotenv
import os

load_dotenv()

# Con esto se puede enviar mails
# 100/dia
# 3000/mes
# Gratarola 🤠
def enviar_email(to: str, subject: str, html: str):
    resend.api_key = os.getenv("RESEND_TOKEN")
    resend_email = os.getenv("RESEND_EMAIL")
    resend.Emails.send({
        "from": resend_email,
        "to": to,
        "subject": subject,
        "html": html
    })
