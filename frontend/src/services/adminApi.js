// src/services/adminApi.js
import backendClient from './backendClient';

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
    // si lo usás para crear usuarios desde el panel
    create: (payload) =>
      backendClient.post('users_b/register', payload),
  },

  canchas: {
    list: () => backendClient.get('canchas/listar'),
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
