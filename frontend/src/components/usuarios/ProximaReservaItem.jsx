import React from 'react';
import Button from '../common/Button/Button';

// Convierte "DD-MM-YYYY" y "HH:mm-HH:mm" en un objeto Date de JS
const getFechaInicioReserva = (fechaStr, horarioStr) => {
  const [dia, mes, anio] = fechaStr.split('-');
  const horaInicio = horarioStr.split('-')[0]; // "21:00"
  return new Date(`${anio}-${mes}-${dia}T${horaInicio}:00`);
};

const ProximaReservaItem = ({ reserva, onConfirmar, onCancelar }) => {
  // --- LÓGICA PARA MOSTRAR EL BOTÓN ---
  const ahora = new Date();
  const inicioReserva = getFechaInicioReserva(reserva.fecha, reserva.horario);
  const unaHoraAntes = new Date(inicioReserva.getTime() - 60 * 60 * 1000);
  const puedeConfirmar = !reserva.confirmada && ahora >= unaHoraAntes;

  return (
    <li className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div>
        <p className="text-white font-bold text-lg">{reserva.cancha}</p>
        <p className="text-gray-300"><span className="font-semibold">Fecha:</span> {reserva.fecha}</p>
        <p className="text-gray-300"><span className="font-semibold">Horario:</span> {reserva.horario}</p>
        {reserva.confirmada && (
          <p className="text-green-400 text-sm mt-2">✓ Asistencia confirmada</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Renderizado condicional del botón de confirmación */}
        {puedeConfirmar && (
          <Button
            texto="Confirmar Asistencia"
            onClick={() => onConfirmar(reserva._id)}
            variant="default"
          />
        )}
        <Button
          texto="Cancelar Reserva"
          onClick={() => onCancelar(reserva._id)}
          variant="eliminar"
        />
      </div>
    </li>
  );
};

export default ProximaReservaItem;