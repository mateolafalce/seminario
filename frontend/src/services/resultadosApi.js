import backendClient from './backendClient';

const resultadosApi = {
  ver: (reservaId) =>
    backendClient.get(`reservas/resultados/${encodeURIComponent(reservaId)}`),

  cargar: (reservaId, resultado) =>
    backendClient.post('reservas/resultados/cargar', {
      reserva_id: reservaId,
      resultado,
    }),
};

export default resultadosApi;
