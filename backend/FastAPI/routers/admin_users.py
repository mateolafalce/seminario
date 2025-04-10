from fastapi import APIRouter, HTTPException, status
from routers.defs import *
from db.models.user import User,UserDB
from db.client import db_client
from bson import ObjectId

router_admin = APIRouter(prefix="/admin",
                    tags=["admin"],
                    responses={status.HTTP_400_BAD_REQUEST:{"message":"No encontrado"}})


@router_admin.get("/users", response_model=list[User])
async def users():
    return users_schema(db_client.users.find())

@router_admin.get("/users/{id}")
async def users(id: str):
    return search_user("_id", ObjectId(id))

@router_admin.post("/add_admin", response_model=User, status_code=status.HTTP_201_CREATED)
async def admin(admin: UserDB):
    if type(search_user_db_admin("username", admin.username)) == UserDB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail ="El usuario ya existe"
        )
    
    admin_dict = dict(admin)
    del admin_dict["id"]

    id = db_client.admins.insert_one(admin_dict).inserted_id

    new_admin = user_schema_db(db_client.admins.find_one({"_id":id}))

    return UserDB(**new_admin)

@router_admin.put("/put_admin",response_model=UserDB)
async def admin(admin: UserDB):

    admin_dict = dict(admin)
    del admin_dict["id"]

    try:
        db_client.admins.find_one_and_replace(
            {"_id":ObjectId(admin.id)}, admin_dict
        )
    except:
        return {"status_code": status.HTTP_400_BAD_REQUEST, "error": "No se pudo actualizar al usuario"}
    
    return search_user_db_admin("_id", ObjectId(admin.id))

@router_admin.delete("/delete_admin/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin(id: str):

    admin_delete = db_client.admins.delete_one({"_id": ObjectId(id)})

    if not admin_delete:
        return {"status_code": status.HTTP_400_BAD_REQUEST, "Error":"No se pudo eliminar al usuario"}