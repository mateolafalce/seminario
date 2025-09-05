#!/bin/bash

# Iniciar los servicios definidos en docker-compose.yml
# El flag -d significa "detached", para que se ejecuten en segundo plano
# El flag --build fuerza la reconstrucción de las imágenes
docker-compose up -d --build

# Opcional: mostrar los logs de los contenedores para verificar que todo está bien
# El flag -f sigue los logs en tiempo real
docker-compose logs -f
