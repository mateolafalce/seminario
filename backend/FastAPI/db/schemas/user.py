def user_schema(user) -> dict:
    return {
        "id": str(user["_id"]),
        "nombre": user["nombre"],
        "apellido": user["apellido"],
        "username": user["username"],
        "habilitado": user["habilitado"],
        "telefono": user["telefono"]  
    }


def user_schema_db(user) -> dict:
    if user is None:
        return None
    return {
        "id": str(user["_id"]),
        "nombre": user["nombre"],
        "apellido": user["apellido"],
        "username": user["username"],
        "telefono": user["telefono"], 
        "habilitado": user["habilitado"],
        "password": user["password"],
    }


def users_schema(users) -> list:
    return [user_schema(user) for user in users]
