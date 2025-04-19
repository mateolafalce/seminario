from fastapi import Depends,HTTPException, status
from db.models.user import User,UserDB
from db.client import db_client
from db.schemas.user import user_schema, users_schema,user_schema_db
from routers.users_b import *


def search_user(field:str,key):
    try:
        user = db_client.users.find_one({field:key})
        return User(**user_schema(user))
    except:
        return {"error":"No se ha podido encontrar el usuario"}
    
def search_user_db(field: str, key):
    try:
        user = db_client.users.find_one({field: key})
        if user:
            return UserDB(**user_schema_db(user))
        return None
    except Exception as e:
        print(f"Error al buscar usuario: {e}")
        return None
    
def is_admin(field:str, key):
    try:
        user = db_client.admins.find_one({field:key})
        if user is None:
            return False
        else:
            return True
    except Exception as e:
        print(f"error al verificar el administrador: {e}")
        return False
    

def search_user_db_admin(field:str,key):
    try:
        user = db_client.admins.find_one({field:key})
        return UserDB(**user_schema_db(user))
    except:
        return None

