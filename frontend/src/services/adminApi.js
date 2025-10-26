import backendClient from './backendClient';

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
      backendClient.get('admin/users', { page, limit }),
    search: (q) =>
      backendClient.post('admin/users/buscar', { nombre: q }),
    update: (id, payload) =>
      backendClient.put(`admin/users/${id}`, payload),
    remove: (id) =>
      backendClient.delete(`admin/users/${id}`),
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
  },
};

export default adminApi;
