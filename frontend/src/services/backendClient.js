// src/services/backendClient.js
import { getApiUrl } from '../config';

/*
  backendClient.js (versión Cookie HttpOnly + CSRF)
  -------------------------------------------------
  - No maneja tokens en JS.
  - Envía siempre credentials: 'include' (para mandar cookies).
  - En no-GET añade X-CSRF-Token leyendo la cookie 'csrf_token'.
*/

const getCookie = (name) => {
  const n = `${name}=`;
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(n))
    ?.slice(n.length) || '';
};

const handleResponse = async (res) => {
  // Normalizamos errores y retornos
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  const parseBody = async () => {
    if (contentType.includes('application/json')) return res.json();
    return res.text();
  };

  if (!res.ok) {
    let data;
    try { data = await res.clone().json(); }
    catch { data = { detail: res.statusText }; }

    const error = new Error(data?.detail || data?.message || `Error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return parseBody();
};

const request = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  // CSRF para no-GET
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // 👈 necesario para que nave mandé las cookies
  };

  // Serialización del body si es objeto plano
  if (
    config.body &&
    typeof config.body === 'object' &&
    !(config.body instanceof FormData) &&
    !(config.body instanceof URLSearchParams) &&
    typeof config.body !== 'string'
  ) {
    config.body = JSON.stringify(config.body);
  }

  // Si es URLSearchParams, el Content-Type debe ser x-www-form-urlencoded
  if (config.body instanceof URLSearchParams) {
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const res = await fetch(url, config);
  return handleResponse(res);
};

const backendClient = {
  get: (endpoint, params, options = {}) => {
    let path = endpoint;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) path += `?${qs}`;
    }
    return request(path, { ...options, method: 'GET' });
  },
  post: (endpoint, data, options = {}) =>
    request(endpoint, { ...options, method: 'POST', body: data }),

  put: (endpoint, data, options = {}) =>
    request(endpoint, { ...options, method: 'PUT', body: data }),

  patch: (endpoint, data, options = {}) =>
    request(endpoint, { ...options, method: 'PATCH', body: data }),

  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'DELETE' }),
};

export default backendClient;
