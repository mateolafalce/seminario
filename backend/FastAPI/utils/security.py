import secrets
import hashlib

def generate_salt() -> str:
    """Genera un salt aleatorio de 32 bytes en formato hexadecimal"""
    return secrets.token_hex(32)

def hash_password_with_salt(password: str, salt: str) -> str:
    """Hashea una contraseña usando SHA256 con el salt proporcionado"""
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password_with_salt(password: str, salt: str, hashed_password: str) -> bool:
    """Verifica si una contraseña coincide con su hash"""
    return hash_password_with_salt(password, salt) == hashed_password

def is_bcrypt_hash(hashed_password: str) -> bool:
    """Detecta si un hash es de bcrypt para mantener compatibilidad"""
    return hashed_password.startswith('$2b$') or hashed_password.startswith('$2a$') or hashed_password.startswith('$2y$')