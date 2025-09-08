import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import MiToast from '../components/common/Toast/MiToast';
import { toast } from "react-toastify";

function MisReservas() {
  const [vista, setVista] = useState('proximos');
  const [proximasReservas, setProximasReservas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, apiFetch } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchDatos = async () => {
      setLoading(true);
      try {
        const [resProximas, resHistorial] = await Promise.all([
          apiFetch('/api/reservas/mis-reservas'),
          apiFetch('/api/reservas/historial')
        ]);

        if (resProximas.ok) {
          const data = await resProximas.json();
          setProximasReservas(data);
        }
        if (resHistorial.ok) {
          const data = await resHistorial.json();
          setHistorial(data);
        }
      } catch (error) {
        if (error.message !== 'Sesión expirada') {
          console.error("Error al obtener los datos de reservas:", error);
          toast(<MiToast mensaje="No se pudieron cargar tus reservas." color="var(--color-red-400)"/>);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [isAuthenticated, apiFetch]);

  const handleCancelar = async (reservaId) => {
    if (!window.confirm("¿Estás seguro de que quieres cancelar esta reserva?")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/reservas/cancelar/${reservaId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        toast(<MiToast mensaje={data.msg} color="[#e5ff00]"/>);
        setProximasReservas(prev => prev.filter(r => r._id !== reservaId));
      } else {
        toast(<MiToast mensaje={`Error: ${data.detail}`} color="var(--color-red-400)"/>);
      }
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        toast(<MiToast mensaje="Error de conexión al intentar cancelar la reserva." color="var(--color-red-400)"/>);
      }
    }
  };

  if (!isAuthenticated) {
    return <p className="text-center text-red-400 mt-10">Debes iniciar sesión para ver tus reservas.</p>;
  }

  if (loading) {
    return <p className="text-center text-white mt-10">Cargando tus reservas...</p>;
  }

  return (
    <div className="flex flex-col items-center min-h-[70vh] py-8 px-4">
      <div className="w-full max-w-4xl">
        <h2 className="text-3xl font-bold text-[#eaff00] mb-8 text-center">Mis Reservas</h2>
        {/* Botones para cambiar de vista */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setVista('proximos')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              vista === 'proximos'
                ? 'bg-[#eaff00] text-[#101a2a]'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            Próximas Reservas
          </button>
          <button
            onClick={() => setVista('historial')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              vista === 'historial'
                ? 'bg-[#eaff00] text-[#101a2a]'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            Historial
          </button>
        </div>
        {/* Renderizado condicional de la lista */}
        {vista === 'proximos' ? (
          <div>
            {proximasReservas.length === 0 ? (
              <p className="text-gray-300 text-center">No tienes ninguna reserva activa.</p>
            ) : (
              <ul className="space-y-4">
                {proximasReservas.map((reserva) => (
                  <li key={reserva._id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <p className="text-white font-bold text-lg">{reserva.cancha}</p>
                      <p className="text-gray-300"><span className="font-semibold">Fecha:</span> {reserva.fecha}</p>
                      <p className="text-gray-300"><span className="font-semibold">Horario:</span> {reserva.horario}</p>
                    </div>
                    <Button
                      texto="Cancelar Reserva"
                      onClick={() => handleCancelar(reserva._id)}
                      variant="eliminar"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div>
            {historial.length === 0 ? (
              <p className="text-gray-300 text-center">No tienes reservas en tu historial.</p>
            ) : (
              <ul className="space-y-4">
                {historial.map((reserva) => (
                  <li key={reserva._id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 opacity-80">
                    <div>
                      <p className="text-white font-bold text-lg">{reserva.cancha}</p>
                      <p className="text-gray-300"><span className="font-semibold">Fecha:</span> {reserva.fecha}</p>
                      <p className="text-gray-300"><span className="font-semibold">Horario:</span> {reserva.horario}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MisReservas;