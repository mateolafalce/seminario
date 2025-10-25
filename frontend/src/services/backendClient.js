import { getApiUrl } from '../config';

const getCookie = (name) => {
  const n = `${name}=`;
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(n))
    ?.slice(n.length) || '';
};

const isJson = (ct) => (ct || '').includes('application/json');
const isBlob = (ct) => (ct || '').includes('application/octet-stream');

const handleResponse = async (res) => {
  if (res.status === 204) return null;

  const ct = res.headers.get('content-type') || '';
  const cd = res.headers.get('content-disposition') || '';

  // blob / descarga
  if (isBlob(ct) || /attachment/i.test(cd)) {
    const blob = await res.blob();
    if (!res.ok) {
      const err = new Error(`Error ${res.status}`);
      err.status = res.status;
      err.data = blob;
      throw err;
    }
    return blob;
  }

  // json o texto
  const parse = async () => (isJson(ct) ? res.json() : res.text());

  if (!res.ok) {
    let data;
    try { data = await res.clone().json(); }
    catch { data = { detail: (await res.text()) || res.statusText }; }

    const error = new Error(data?.detail || data?.message || `Error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return parse();
};

const buildQuery = (params) => {
  if (!params) return '';
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

const request = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    Accept: 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  // CSRF solo en no-GET
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const config = {
    ...options,
    method,
    headers,
    credentials: 'include',           // ← cookies HttpOnly
    cache: 'no-store',                // opcional durante desarrollo
  };

  // Serializar body si es objeto plano
  if (
    config.body &&
    typeof config.body === 'object' &&
    !(config.body instanceof FormData) &&
    !(config.body instanceof URLSearchParams) &&
    typeof config.body !== 'string'
  ) {
    config.body = JSON.stringify(config.body);
  }

  // x-www-form-urlencoded cuando corresponde (login, etc)
  if (config.body instanceof URLSearchParams) {
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  try {
    const res = await fetch(url, config);
    return await handleResponse(res);
  } catch (e) {
    // Error de red / CORS / offline
    const err = new Error('NETWORK_ERROR');
    err.cause = e;
    throw err;
  }
};

const backendClient = {
  get: (endpoint, params, options = {}) =>
    request(`${endpoint}${buildQuery(params)}`, { ...options, method: 'GET' }),

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
