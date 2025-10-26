export const createApi = (handleUnauthorized) => {
  const BASE = import.meta.env.VITE_BACKEND_URL || '/api';

  function getCookie(name) {
    const cookies = (document.cookie || '').split('; ');
    for (const c of cookies) {
      const i = c.indexOf('=');
      if (i === -1) continue;
      const key = decodeURIComponent(c.slice(0, i));
      if (key === name) return decodeURIComponent(c.slice(i + 1));
    }
    return null;
  }

  function buildUrl(path, params) {
    const clean = path.startsWith('http') ? path : `${BASE}/${path.replace(/^\/+/, '')}`;
    if (!params) return clean;
    const qs = new URLSearchParams(params);
    return `${clean}?${qs.toString()}`;
  }

  async function requestRaw(path, { method = 'GET', headers = {}, body, params } = {}) {
    const opts = { method, credentials: 'include', headers: { ...headers } };

    // CSRF solo en mutaciones
    if (!['GET','HEAD','OPTIONS'].includes(method)) {
      const csrf = getCookie('csrf_token');
      if (csrf) opts.headers['X-CSRF-Token'] = csrf;

      if (body && !(body instanceof FormData)) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      } else if (body) {
        opts.body = body; // FormData u otro
      }
    }

    const res = await fetch(buildUrl(path, params), opts);

    if (res.status === 401 && typeof handleUnauthorized === 'function') {
      try { handleUnauthorized(); } catch {}
    }
    return res; // usa tus helpers para parsear
  }

  return {
    get:  (path, params) => requestRaw(path, { method: 'GET', params }),
    post: (path, data)   => requestRaw(path, { method: 'POST', body: data }),
    put:  (path, data)   => requestRaw(path, { method: 'PUT',  body: data }),
    del:  (path)         => requestRaw(path, { method: 'DELETE' }),
    request: requestRaw,
  };
};
