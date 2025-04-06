# Proyecto Seminario - Grupo 5

**Empresa:** Boulevard 81

**Descripcion:** Boulevard 81 es un complejo deportivo de la cuidad de La Plata que actualmente maneja el core de su sistema manualmente con un administrador. El complejo deportivo alquila canchas de paddel para entrenamientos rutinarios y para clientes esporadicos ademas de realizar torneos de padel. El resultado de los torneos de padel tambien son compartidos manualmente mediante una hoja de calcula excel compartida.

**Objetivo:** Ofrecer una solucion web que: 

+ Centralizará el proceso de reserva de canchas (son diferentes y los consumidores son exigentes).

+ Hacer un display de los resultados de los varios torneos realizados allí, en vez de utilizar una hoja de cálculo compartida.

+ Login de los clientes.

+ Sistema de matcheo de parejas basado en su historial deportivo y preferencias.

+ Registro de Ingresos mediante códigos QR facilitando el ingreso y control de participantes.

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