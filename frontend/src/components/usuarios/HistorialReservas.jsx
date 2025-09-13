import React from "react";
import { FiUsers, FiStar } from "react-icons/fi";

const estadoColor = {
  Confirmada: "bg-green-800 text-green-300",
  Reservada: "bg-yellow-800 text-yellow-300",
  Completada: "bg-blue-800 text-blue-300",
  Cancelada: "bg-red-800 text-red-300",
};

const HistorialReservas = ({
  historial,
  onVerJugadores,
  onConfirmarAsistencia,
  onCalificarJugador, // 👈 NUEVO
}) => (
  <div>
    {historial.length === 0 ? (
      <p className="text-gray-300 text-center">No tienes reservas en tu historial.</p>
    ) : (
      <ul className="space-y-4">
        {historial.map((reserva) => {
          const estado = reserva.estado || "Reservada";
          const color = estadoColor[estado] || "bg-gray-700 text-gray-300";
          const confirmada = reserva.asistenciaConfirmada;
          const cantidad = reserva.cantidad_usuarios || 1;

          return (
            <li key={reserva._id} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-bold text-lg">{reserva.cancha}</p>
                  <p className="text-gray-300"><span className="font-semibold">Fecha:</span> {reserva.fecha}</p>
                  <p className="text-gray-300"><span className="font-semibold">Horario:</span> {reserva.horario}</p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Jugadores:</span> {cantidad} / 6
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Asistencia:</span>{" "}
                    {confirmada ? (
                      <span className="text-green-400">Confirmada</span>
                    ) : (
                      <span className="text-yellow-400">Pendiente</span>
                    )}
                  </p>
                </div>
                <span className={`${color} text-xs font-medium px-2.5 py-1 rounded-full`}>
                  {estado}
                </span>
              </div>
              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => onVerJugadores(reserva)}
                  className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center"
                >
                  <FiUsers className="mr-1" /> Ver jugadores
                </button>
                {/* Solo mostrar "Calificar jugadores" si la reserva está Confirmada */}
                {reserva.estado === "Confirmada" && (
                  <button
                    onClick={() => onCalificarJugador(reserva)}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                  >
                    <FiStar className="mr-1" /> Calificar jugadores
                  </button>
                )}
                {!confirmada && (
                  <button
                    onClick={() => onConfirmarAsistencia(reserva)}
                    className="text-green-400 hover:text-green-300 text-sm"
                  >
                    Confirmar asistencia
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export default HistorialReservas;