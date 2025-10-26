import backendClient from './backendClient';

const resultadosApi = {
  ver: (reservaId) =>
    backendClient.get(`reservas/resultados/${encodeURIComponent(reservaId)}`),

  cargar: (reservaId, resultado) => {
    const text = String(resultado ?? '').trim();
    if (!reservaId || !text) {
      const err = new Error('Faltan datos para cargar resultado');
      err.status = 400;
      throw err;
    }
    return backendClient.post('reservas/resultados/cargar', {
      reserva_id: String(reservaId),
      resultado: text
    });
  },
};

export default resultadosApi;
