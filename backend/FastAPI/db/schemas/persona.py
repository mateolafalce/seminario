def persona_schema(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "nombre": doc.get("nombre"),
        "apellido": doc.get("apellido"),
        "email": doc.get("email"),
        "dni": doc.get("dni"),
    }

def personas_schema(docs) -> list:
    return [persona_schema(d) for d in docs]
