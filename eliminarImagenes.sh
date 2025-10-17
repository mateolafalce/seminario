# Eliminar todos los contenedores
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# Eliminar todas las imágenes
docker rmi -f $(docker images -q)

# Limpiar todo
docker system prune -a -f --volumes