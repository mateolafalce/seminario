#!/bin/bash

# Detener y eliminar los contenedores, redes y volúmenes creados por `up`
docker-compose down

# Opcional: eliminar también las imágenes de Docker para una limpieza completa
# Listar las imágenes que contienen "seminario" en su nombre y eliminarlas
docker images | grep "seminario" | awk '{print $3}' | xargs docker rmi -f
