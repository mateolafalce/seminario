from db.client import db_client
from pymongo import ASCENDING, DESCENDING

def ensure_resenias_indexes() -> None:
    # Un reseñador (i) no puede reseñar más de una vez al mismo jugador (j) en la misma reserva
    db_client.resenias.create_index(
        [("i", ASCENDING), ("j", ASCENDING), ("reserva", ASCENDING)],
        unique=True,
        name="resenias_i_j_reserva_unique",
    )
    # Lecturas frecuentes: "mis reseñas" (por j)
    db_client.resenias.create_index([("j", ASCENDING), ("fecha", DESCENDING)], name="resenias_j_fecha")
    # Acceso por reserva (útil para validaciones o listados)
    db_client.resenias.create_index([("reserva", ASCENDING)], name="resenias_reserva_1")
