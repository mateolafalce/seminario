import React from "react";
import { FiUsers } from "react-icons/fi";

const HistorialReservas = ({ historial, onVerJugadores }) => (
  <div>
    {historial.length === 0 ? (
      <p className="text-gray-300 text-center">No tienes reservas en tu historial.</p>
    ) : (
      <ul className="space-y-4">
        {historial.map((reserva) => (
          <li key={reserva._id} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-bold text-lg">{reserva.cancha}</p>
                <p className="text-gray-300"><span className="font-semibold">Fecha:</span> {reserva.fecha}</p>
                <p className="text-gray-300"><span className="font-semibold">Horario:</span> {reserva.horario}</p>
              </div>
              <span className="bg-green-800 text-green-300 text-xs font-medium px-2.5 py-1 rounded-full">
                Confirmada
              </span>
            </div>
            <button 
              onClick={() => onVerJugadores(reserva)}
              className="mt-3 text-yellow-400 hover:text-yellow-300 text-sm flex items-center"
            >
              <FiUsers className="mr-1" /> Ver jugadores
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default HistorialReservas;