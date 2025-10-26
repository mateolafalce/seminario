import backendClient from './backendClient';

const categoriasApi = {
  listar: () => backendClient.get('categorias/listar'),

  crear: ({ nombre, nivel }) =>
    // Enviamos ambos campos por compat: si tu backend usa "orden" o "nivel", lo cubrimos.
    backendClient.post('categorias/crear', { nombre, orden: nivel, nivel }),

  modificar: (id, { nombre, nivel }) =>
    backendClient.put(`categorias/modificar/${encodeURIComponent(id)}`, { nombre, orden: nivel, nivel }),

  eliminar: (id) =>
    backendClient.delete(`categorias/eliminar/${encodeURIComponent(id)}`),
};

export default categoriasApi;
