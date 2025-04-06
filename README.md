# Proyecto Seminario - Grupo 5

Empresa: Boulevard 81

## Backend

```bash
sudo apt update
sudo apt install python3-pip
```

```bash
python3 -m venv .venv && source .venv/bin/activate
```

Descargar algunas dependencias

```bash
pip install uvicorn && pip install "fastapi[all]" && pip install python-jose && pip install passlib && pip install pymongo
```

Ejecutar el servidor

```bash
cd backend/FastAPI/
```

```bash
uvicorn main:app --reload
```

## Frontend

Instalar [Node.js](https://nodejs.org/es/download)

```bash
cd frontend
```

```bash
npm install react-router-dom
```

```bash
npm install
```

```bash
npm run dev
```