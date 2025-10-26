from db.client import db_client
from pymongo import ASCENDING

def ensure_categoria_indexes() -> None:
    # nombre único
    db_client.categorias.create_index(
        [("nombre", ASCENDING)], unique=True, name="categorias_nombre_1_unique"
    )
    # nivel ordinal único (evita dos categorías con el mismo nivel)
    db_client.categorias.create_index(
        [("nivel", ASCENDING)], unique=True, name="categorias_nivel_1_unique"
    )
