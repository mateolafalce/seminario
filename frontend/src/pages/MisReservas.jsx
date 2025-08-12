import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import MiToast from '../components/common/Toast/MiToast';
import { toast } from "react-toastify";

function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, apiFetch } = useContext(AuthContext); // Usamos apiFetch del contexto

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchReservas = async () => {
      try {
        // Usamos apiFetch en lugar de fetch
        const response = await apiFetch('/api/reservas/mis-reservas');
        if (response.ok) {
          const data = await response.json();
          setReservas(data);
        }
      } catch (error) {
        // El error 401 ya es manejado, aquí solo capturamos otros errores
        if (error.message !== 'Sesión expirada') {
          console.error("Error al obtener las reservas:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReservas();
  }, [isAuthenticated, apiFetch]);

  const handleCancelar = async (reservaId) => {
    if (!window.confirm("¿Estás seguro de que quieres cancelar esta reserva?")) {
      return;
    }

    try {
      // Usamos apiFetch también para las peticiones DELETE
      const response = await apiFetch(`/api/reservas/cancelar/${reservaId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        toast(<MiToast mensaje={data.msg} color="[#e5ff00]"/>);
        {/*alert(data.msg); //revisar si aparece*/}
        setReservas(prev => prev.filter(r => r._id !== reservaId));
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
    <div className="flex flex-col items-center min-h-[70vh] bg-[#101a2a] py-8 px-4">
      <div className="w-full max-w-4xl">
        <h2 className="text-3xl font-bold text-[#eaff00] mb-8 text-center">Mis Reservas</h2>
        {reservas.length === 0 ? (
          <p className="text-gray-300 text-center">No tienes ninguna reserva activa.</p>
        ) : (
          <ul className="space-y-4">
            {reservas.map((reserva) => (
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
    </div>
  );
}

export default MisReservas;