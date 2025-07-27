from fastapi import Depends, HTTPException, status
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from db.models.user import User
from routers.defs import *
import asyncio

ALGORITHM = "HS256"
SECRET = "201d573bd7d1344d3a3bfce1550b69102fd11be3db6d379508b6cccc58ea230b"
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/users_b/login")


async def current_user(token: str = Depends(oauth2)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await asyncio.to_thread(lambda: db_client.users.find_one({"username": username}))
    if user is None:
        raise credentials_exception

    return {
        "id": str(user["_id"]),
        "username": user.get("username"),
        "nombre": user.get("nombre"),
        "email": user.get("email"),
        "habilitado": user.get("habilitado"),
        "categoria": user.get("categoria")
    }
