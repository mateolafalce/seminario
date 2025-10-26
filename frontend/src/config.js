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
