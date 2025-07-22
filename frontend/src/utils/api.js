/**
 * Una función de fábrica que crea un wrapper de fetch configurado.
 * @param {function} handleUnauthorized - La función a llamar cuando se recibe un 401.
 * @returns {function} Una función `apiFetch` que se comporta como fetch pero con manejo de auth.
 */
export const createApi = (handleUnauthorized) => {
  const BACKEND_URL = `http://${window.location.hostname}:8000`;

  /**
   * Wrapper para la API fetch que añade automáticamente el token de autorización
   * y maneja globalmente los errores 401 (Unauthorized).
   * @param {string} endpoint - El endpoint de la API a llamar (ej. '/api/reservas/mis-reservas').
   * @param {object} options - Opciones de configuración para fetch (method, body, etc.).
   * @returns {Promise<Response>} La respuesta de la API.
   */
  const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('accessToken');
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}${endpoint}`
      : endpoint;

    // Configuración de los headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Realizar la petición
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // --- MANEJO CENTRALIZADO DE SESIÓN EXPIRADA ---
    if (response.status === 401) {
      handleUnauthorized();
      // Lanzamos un error para detener la ejecución del código que llamó a apiFetch
      throw new Error('Sesión expirada');
    }

    return response;
  };

  return apiFetch;
};