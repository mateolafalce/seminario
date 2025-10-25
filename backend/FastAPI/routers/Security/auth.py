from fastapi import Depends, HTTPException, status, Request, Response
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from db.client import db_client
from bson import ObjectId
import asyncio, os, secrets
from services.authz import user_has_any_role, get_user_roles_and_perms, user_has_permission

ALGORITHM = "HS256"
SECRET = os.getenv("JWT_SECRET", "201d573bd7d1344d3a3bfce1550b69102fd11be3db6d379508b6cccc58ea230b")
ACCESS_MINUTES = int(os.getenv("ACCESS_MINUTES", "60"))

# Cookies
ACCESS_COOKIE = "access_token"
CSRF_COOKIE = "csrf_token"

def create_access_token(sub: str, extra: dict | None = None):
    to_encode = {
        "sub": sub,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES)
    }
    if extra:
        to_encode.update(extra)
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)

def decode_token(token: str):
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])

def set_auth_cookies(response: Response, access_token: str):
    """
    Setea cookie HttpOnly con el JWT y cookie CSRF legible por JS.
    Ajusta SameSite/secure según tu despliegue:
      - mismo dominio o reverse proxy: samesite="lax" suele bastar
      - dominios distintos: samesite="none" y secure=True
    """
    SAME_SITE = os.getenv("COOKIE_SAMESITE", "lax")  # "lax" | "none" | "strict"
    SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    DOMAIN = os.getenv("COOKIE_DOMAIN")  # ej. ".tudominio.com" si compartís subdominios

    # JWT HttpOnly
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        httponly=True,
        secure=SECURE,
        samesite=SAME_SITE,
        domain=DOMAIN,
        path="/",
        max_age=ACCESS_MINUTES * 60,
    )
    # CSRF (legible por JS)
    csrf = secrets.token_urlsafe(32)
    response.set_cookie(
        key=CSRF_COOKIE,
        value=csrf,
        httponly=False,
        secure=SECURE,
        samesite=SAME_SITE,
        domain=DOMAIN,
        path="/",
        max_age=ACCESS_MINUTES * 60,
    )
    return csrf

def clear_auth_cookies(response: Response):
    DOMAIN = os.getenv("COOKIE_DOMAIN")
    response.delete_cookie(ACCESS_COOKIE, path="/", domain=DOMAIN)
    response.delete_cookie(CSRF_COOKIE, path="/", domain=DOMAIN)

async def current_user(request: Request):
    """
    Lee el JWT desde la cookie HttpOnly `access_token` y retorna el usuario básico.
    Reemplaza el uso de OAuth2PasswordBearer (ya no usamos Authorization header).
    """
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await asyncio.to_thread(lambda: db_client.users.find_one({"username": username}))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return {
        "id": str(user["_id"]),
        "username": user.get("username"),
        "nombre": user.get("nombre"),
        "email": user.get("email"),
        "habilitado": user.get("habilitado"),
        "categoria": user.get("categoria")
    }

def verify_csrf(request: Request):
    """
    Proteger métodos no-GET. Compara header X-CSRF-Token con cookie csrf_token.
    Aplicá esta dep en POST/PUT/PATCH/DELETE.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    csrf_header = request.headers.get("X-CSRF-Token")
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")

async def require_admin(user=Depends(current_user)):
    uid = user.get("id")
    if not uid or not ObjectId.is_valid(uid):
        raise HTTPException(status_code=401, detail="No autenticado")

    oid = ObjectId(uid)

    # RBAC check using authz service
    is_admin = user_has_any_role(oid, "admin")
    
    if is_admin:
        return user

    # 2) flag opcional en users (fallback legacy)
    udoc = db_client.users.find_one({"_id": oid}, {"is_admin": 1})
    if udoc and udoc.get("is_admin"):
        return user

    raise HTTPException(status_code=403, detail="Requiere administrador")

def require_roles(*role_names: str):
    async def _dep(user = Depends(current_user)):
        uid = (user or {}).get("id")
        if not uid or not ObjectId.is_valid(uid):
            raise HTTPException(status_code=401, detail="No autenticado")
        if not user_has_any_role(ObjectId(uid), *role_names):
            raise HTTPException(status_code=403, detail=f"Requiere rol: {', '.join(role_names)}")
        return user
    return _dep

def require_perms(*perms: str):
    async def _dep(user = Depends(current_user)):
        uid = (user or {}).get("id")
        if not uid or not ObjectId.is_valid(uid):
            raise HTTPException(status_code=401, detail="No autenticado")
        uoid = ObjectId(uid)

        # Admin siempre pasa
        if user_has_any_role(uoid, "admin"):
            return user

        for p in perms:
            if user_has_permission(uoid, p):
                return user

        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    return _dep
