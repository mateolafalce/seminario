from db.client import db_client
from pymongo import ASCENDING

def ensure_cancha_indexes():
    db_client.canchas.create_index([("nombre", ASCENDING)], unique=True, name="canchas_nombre_1_unique")
