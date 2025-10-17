# Construir y ejecutar ambos servicios
docker compose up --build

# Ejecutar en segundo plano
docker compose up -d

# Ver logs
docker compose logs -f

# Parar servicios
docker compose down

# Reconstruir solo un servicio
docker compose build frontend
docker compose up frontend
