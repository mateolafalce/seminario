import resend
from dotenv import load_dotenv
import os

load_dotenv()

def enviar_email(to: str, subject: str, html: str):
    resend.api_key = os.getenv("RESEND_TOKEN")
    resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": to,
        "subject": subject,
        "html": html
    })
