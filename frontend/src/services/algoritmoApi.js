import backendClient from './backendClient';

const algoritmoApi = {
  // Lista de usuarios habilitados para el panel del algoritmo
  users: (page = 1, limit = 20) =>
    backendClient.get(`algoritmo/users?page=${page}&limit=${limit}`),

  // Top-K para un usuario dado (incluye S, J, alpha, beta, A_saved, A_calc)
  top: (userId, top = 5) =>
    backendClient.get(`algoritmo/top/${encodeURIComponent(userId)}?top=${top}`),

  // Recalcula/actualiza relaciones A(i,j) persistidas (pesos.a)
  recompute: () => backendClient.post('algoritmo/recompute', {}),

  // Optimiza β por usuario i (ajusta alpha/beta y A en pesos)
  optimize: () => backendClient.post('algoritmo/optimize', {}),
};

export default algoritmoApi;
