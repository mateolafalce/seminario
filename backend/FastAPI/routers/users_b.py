from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from routers.defs import *
from db.models.user import User,UserDB
from db.client import db_client


router = APIRouter(prefix="/users_b",
                    tags=["usuarios_b"],
                    responses={status.HTTP_400_BAD_REQUEST:{"message":"No encontrado"}})

ALGORITHM = "HS256"
ACCESS_TOKEN_DURATION = 5
SECRET = "201d573bd7d1344d3a3bfce1550b69102fd11be3db6d379508b6cccc58ea230b"



oauth2 = OAuth2PasswordBearer(tokenUrl = "/login")

crypt = CryptContext(schemes=["bcrypt"])


async def current_user(token: User = Depends(oauth2)):
    exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación inválidas",
            headers={"WWWW-Authenticate":"Bearer"})
    try:
        username = jwt.decode(token, SECRET, algorithms=[ALGORITHM]).get("sub")
        if username is None:
            raise exception
        
    except JWTError:
        raise exception
    
    return search_user("username",username)


@router.post("/register", response_model=User,status_code=status.HTTP_201_CREATED)
async def register(user: UserDB):
    existing_user = search_user_db("email", user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario ya existe")

    user_dict = dict(user)
    del user_dict["id"]

    #hasheo la contraseña
    hashed_password = crypt.hash(user.password)
    user_dict["password"] = hashed_password

    id = db_client.users.insert_one(user_dict).inserted_id

    new_user_data = db_client.users.find_one({"_id": id})
    new_user = user_schema(new_user_data)

    return User(**new_user)



@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user_db = user_schema_db(db_client.users.find_one({"username":form.username}))
    if not user_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,detail="El usuario no es correcto")
    
    if not crypt.verify(form.password,user_db["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,detail="La contraseña no es correcta"
        )
    
    access_token = {"sub":user_db["username"],
                    "exp":datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_DURATION)}

    return {"access_token": jwt.encode(access_token,SECRET, algorithm=ALGORITHM), "token_type":"bearer"}

@router.get("/me")
async def me(user: User = Depends(current_user)):
    return user