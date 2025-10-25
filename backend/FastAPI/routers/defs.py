from db.models.user import User, UserDB
from db.client import db_client
from db.schemas.user import user_schema, user_schema_db
from services.authz import user_has_any_role
from bson import ObjectId

def search_user(field: str, key):
    try:
        user = db_client.users.find_one({field: key})
        return User(**user_schema(user))
    except BaseException:
        return {"error": "No se ha podido encontrar el usuario"}

def search_user_db(field: str, key):
    try:
        user = db_client.users.find_one({field: key})
        if user:
            return UserDB(**user_schema_db(user))
        return None
    except Exception as e:
        print(f"Error al buscar usuario: {e}")
        return None

def is_admin(user_id: str) -> bool:
    if not ObjectId.is_valid(user_id):
        return False
    return user_has_any_role(ObjectId(user_id), "admin")

# Legacy helper (si alguien lo usa): retorna UserDB si el user (por _id/user) es admin vía RBAC
def search_user_db_admin(field: str, key):
    try:
        if field in {"_id", "user"} and ObjectId.is_valid(str(key)):
            uoid = ObjectId(str(key))
            if user_has_any_role(uoid, "admin"):
                u = db_client.users.find_one({"_id": uoid})
                return UserDB(**user_schema_db(u)) if u else None
        return None
    except BaseException:
        return None
