# frontend/Dockerfile

# 1. Imagen Base
FROM node:22-alpine

# 2. Directorio de Trabajo
WORKDIR /app

# 3. Copiar e Instalar Dependencias
COPY package*.json ./
RUN npm ci

# 4. Copiar el Código de la Aplicación
COPY . .

# 5. Exponer el Puerto
EXPOSE 8080

# 6. Comando de Inicio
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
