import React from 'react';
import Button from '../common/Button/Button';

// Convierte "DD-MM-YYYY" y "HH:mm-HH:mm" en un objeto Date de JS
const getFechaInicioReserva = (fechaStr, horarioStr) => {
  const [dia, mes, anio] = fechaStr.split('-');
  const horaInicio = horarioStr.split('-')[0]; // "21:00"
  return new Date(`${anio}-${mes}-${dia}T${horaInicio}:00`);
};

const ProximaReservaItem = ({ reserva, onConfirmar, onCancelar }) => {
  const ahora = new Date();
  const inicioReserva = getFechaInicioReserva(reserva.fecha, reserva.horario); 
  const limite24Horas = new Date(inicioReserva.getTime() - 24 * 60 * 60 * 1000);
  const usuarioConfirmo = reserva.asistenciaConfirmada === true;
  const puedeConfirmar = ahora >= limite24Horas;

  return (
    <li className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div>
        <p className="text-white font-bold text-lg">{reserva.cancha}</p>
        <p className="text-gray-300"><span className="font-semibold">Fecha:</span> {reserva.fecha}</p>
        <p className="text-gray-300"><span className="font-semibold">Horario:</span> {reserva.horario}</p>
        
        {usuarioConfirmo && (
          <p className="text-green-400 text-sm mt-2">✓ Asistencia registrada</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* AQUÍ ESTÁ EL CAMBIO IMPORTANTE: RENDERIZAR CONDICIONALMENTE DOS BOTONES DIFERENTES */}
        {puedeConfirmar && !usuarioConfirmo && (
          <Button
            texto="Confirmar Asistencia"
            onClick={() => onConfirmar(reserva._id)}
            variant="primary"
          />
        )}
        
        {puedeConfirmar && usuarioConfirmo && (
          <button 
            className="px-4 py-2 bg-gray-600 text-gray-300 rounded-full cursor-not-allowed text-sm font-medium"
            disabled
          >
            Asistencia Confirmada
          </button>
        )}
        
        <Button
          texto="Cancelar Reserva"
          onClick={() => onCancelar(reserva._id)}
          variant="primary"
        />
      </div>
    </li>
  );
};

export default ProximaReservaItem;