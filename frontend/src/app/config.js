// En desarrollo usa URL absoluta (puerto del FastAPI). En prod, usa ruta relativa /api.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Si tenés FastAPI en 8000:
export const BACKEND_URL = IS_LOCAL ? `http://${window.location.hostname}:8000` : '';

export const getApiUrl = (endpoint) => {
  const clean = String(endpoint).replace(/^\/+/, '');
  // En dev: http://host:8000/api/...
  // En prod: /api/...
  return IS_LOCAL ? `${BACKEND_URL}/api/${clean}` : `/api/${clean}`;
};

export const getFileUrl = (path) => {
  if (!path) return "";

  // Si ya es absoluta (http/https), la dejamos como está
  if (/^https?:\/\//i.test(path)) return path;

  // En local usamos el BACKEND_URL (ej: http://localhost:8000)
  if (IS_LOCAL) {
    return `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  // En prod asumimos que /images lo resuelve el mismo host (nginx / reverse-proxy)
  return path;
};
