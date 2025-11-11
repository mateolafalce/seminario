import backendClient from './backendClient';

// ---- Helper para convertir fecha YYYY-MM-DD a DD-MM-YYYY ----
const toDDMMYYYY = (iso) => {
  if (!iso) return iso;
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

// util local para convertir fecha a DD-MM-YYYY
const toDMY = (d) => {
  if (d instanceof Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  if (typeof d === 'string') {
    // si ya viene DD-MM-YYYY, dejarla
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) return d;
    // si viene YYYY-MM-DD, convertirla
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, d2] = d.split('-');
      return `${d2}-${m}-${y}`;
    }
  }
  return d; // último recurso
};

// ---- normalizadores “paracaídas” ----
const normHorarios = (data) =>
  (Array.isArray(data) ? data : []).map(it => ({
    id: it?.id ?? it?.hora ?? String(it),
    hora: it?.hora ?? String(it),
  }));

const normCanchas = (data) =>
  (Array.isArray(data) ? data : []).map(it => ({
    id: it?.id ?? it?.nombre ?? String(it),
    nombre: it?.nombre ?? String(it),
  }));

const adminApi = {
  users: {
    list: (page = 1, limit = 10) =>
      backendClient.get('users_b/admin/users', { page, limit }),
    search: (q) =>
      backendClient.post('users_b/buscar', { nombre: q }),
    update: (id, payload) =>
      backendClient.post('users_b/modificar', {
        identificador: id,
        nombre: payload.nombre,
        apellido: payload.apellido,
        email: payload.email,
        categoria: payload.categoria || null,
        habilitado: !!payload.habilitado,
      }),
    remove: (id) =>
      backendClient.delete(`users_b/${id}`),
    create: (payload) =>
      backendClient.post('users_b/register', payload),
  },

  horarios: {
    // shape nuevo por defecto: [{ id, hora }]
    list: (simple = false) =>
      backendClient.get('horarios/listar', { simple }),
    // siempre normalizado a {id, hora} (tolera ambos shapes)
    listNormalized: async () => {
      const data = await backendClient.get('horarios/listar', { simple: false });
      return normHorarios(data);
    },
  },

  canchas: {
    // si tu backend ya soporta ?simple= como en horarios, podés pasar simple=false
    list: (simple = true) => backendClient.get('canchas/listar', { simple }),
    // siempre normalizado a {id, nombre} (tolera ambos shapes)
    listNormalized: async () => {
      const data = await backendClient.get('canchas/listar', { simple: false });
      return normCanchas(data);
    },
    create: (nombre) => backendClient.post('canchas/crear', { nombre }),
    update: (id, nombre) => backendClient.put(`canchas/modificar/${id}`, { nombre }),
    remove: (id) => backendClient.delete(`canchas/eliminar/${id}`),
  },

  reservas: {
    list: (fecha) => backendClient.get('reservas/listar', { fecha }),
    cantidades: (fecha) => backendClient.get('reservas/cantidad', { fecha }),
    detalle: (cancha, horario, fecha, usuario_id) =>
      backendClient.get('reservas/detalle', { cancha, horario, fecha, usuario_id }),
    cancelar: (reservaId) => backendClient.delete(`reservas/cancelar/${reservaId}`),
    
    // Búsqueda admin con filtros y paginación
    adminSearch: async (filters) => {
      return await backendClient.post('/reservas/admin/buscar', filters);
    },

    // Cancelar reserva (admin) - usa DELETE
    cancelarReserva: async (reservaId) => {
      return await backendClient.delete(`/reservas/admin/cancelar/${reservaId}`);
    },
    
    // Crear reserva admin - convierte fecha a DD-MM-YYYY
    crearReservaAdmin: async (data) => {
      const payload = { ...data, fecha: toDMY(data.fecha) };
      return await backendClient.post('/reservas/admin/crear', payload);
    },
  },
};

// --- Named exports para el admin modal (canchas/horarios) ---
export const listarCanchas = async () => {
  const data = await backendClient.get('canchas/listar'); // GET /api/canchas/listar
  const list = data?.canchas ?? data ?? [];
  return list.map(c => ({ id: c._id || c.id, nombre: c.nombre }));
};

export const listarHorarios = async () => {
  const data = await backendClient.get('horarios/listar'); // GET /api/horarios/listar
  const list = data?.horarios ?? data ?? [];
  return list.map(h => ({
    id: h._id || h.id,
    hora: h.hora || `${h.inicio}-${h.fin}`,
    inicio: h.inicio,
    fin: h.fin,
  }));
};

// Buscar usuarios por prefijo (username / nombre / apellido / dni)
export const buscarUsuariosAdmin = async (term) => {
  if (!term?.trim()) return [];
  const resp = await backendClient.post('users_b/buscar', { nombre: term.trim() });
  const rows = resp?.clientes ?? [];
  return rows.map(u => ({
    id: u.id,
    username: u.username,
    nombre: u.persona?.nombre || '',
    apellido: u.persona?.apellido || '',
    email: u.persona?.email || '',
    label: `${u.persona?.nombre || ''} ${u.persona?.apellido || ''} (@${u.username})`.trim(),
  }));
};

export default adminApi;
