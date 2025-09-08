import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import MiToast from '../components/common/Toast/MiToast';
import { toast } from "react-toastify";
import Modal from '../components/common/Modal/Modal';
import { FiUsers, FiStar } from 'react-icons/fi';

function MisReservas() {
  const [vista, setVista] = useState('proximos');
  const [proximasReservas, setProximasReservas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, apiFetch } = useContext(AuthContext);
  
  // Estados para el modal de jugadores
  const [modalJugadoresAbierto, setModalJugadoresAbierto] = useState(false);
  const [jugadoresReserva, setJugadoresReserva] = useState([]);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [loadingJugadores, setLoadingJugadores] = useState(false);

  // Estados para la calificación
  const [modalCalificacionAbierto, setModalCalificacionAbierto] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [calificacion, setCalificacion] = useState(5);
  const [observacion, setObservacion] = useState('');

  // Función existente para cargar reservas
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

  // Modifica esta función para que actualice también el historial
  const handleConfirmar = async (reservaId) => {
    try {
      const response = await apiFetch(`/api/reservas/confirmar/${reservaId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        toast(<MiToast mensaje="Asistencia confirmada" color="[#e5ff00]"/>);
        
        // Actualizar estado local
        setProximasReservas(prev => 
          prev.filter(r => r._id !== reservaId)  // Quitar de próximas reservas
        );
        
        // Buscar la reserva que acabamos de confirmar
        const reservaConfirmada = proximasReservas.find(r => r._id === reservaId);
        if (reservaConfirmada) {
          // Añadir al historial
          setHistorial(prev => [reservaConfirmada, ...prev]);
        }
        
        // Alternativamente, puedes volver a cargar los datos
        // fetchDatos();
      } else {
        toast(<MiToast mensaje={`Error: ${data.detail}`} color="var(--color-red-400)"/>);
      }
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        toast(<MiToast mensaje="Error de conexión" color="var(--color-red-400)"/>);
      }
    }
  };

  // Función para ver jugadores de una reserva - SIN DATOS HARDCODEADOS
  const handleVerJugadores = async (reserva) => {
    setReservaSeleccionada(reserva);
    setLoadingJugadores(true);
    setModalJugadoresAbierto(true);
    
    try {
      // Endpoint para obtener jugadores de una reserva
      const response = await apiFetch(`/api/reservas/jugadores/${reserva._id}`);
      
      if (response.ok) {
        const data = await response.json();
        setJugadoresReserva(data);
      } else {
        const errorData = await response.json();
        toast(<MiToast mensaje={errorData.detail || "No se pudieron obtener los jugadores"} color="var(--color-red-400)"/>);
        setJugadoresReserva([]);
      }
    } catch (error) {
      toast(<MiToast mensaje="Error al cargar los jugadores" color="var(--color-red-400)"/>);
      setJugadoresReserva([]);
    } finally {
      setLoadingJugadores(false);
    }
  };

  // Función para abrir el modal de calificación
  const handleCalificarJugador = (jugador) => {
    setJugadorSeleccionado(jugador);
    setModalCalificacionAbierto(true);
  };

  // Función para enviar calificación
  const handleEnviarCalificacion = async () => {
    try {
      const response = await apiFetch('/api/users_b/reseñar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          con: jugadorSeleccionado._id,
          calificacion: calificacion.toString(),
          observacion: observacion
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast(<MiToast mensaje="Jugador calificado correctamente" color="[#e5ff00]"/>);
        setModalCalificacionAbierto(false);
        
        // Marcar jugador como calificado
        setJugadoresReserva(prev => 
          prev.map(j => j._id === jugadorSeleccionado._id 
            ? {...j, calificado: true} 
            : j
          )
        );
      } else {
        const error = await response.json();
        toast(<MiToast mensaje={error.detail || "Error al calificar"} color="var(--color-red-400)"/>);
      }
    } catch (error) {
      toast(<MiToast mensaje="Error de conexión" color="var(--color-red-400)"/>);
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
                      {reserva.confirmada && (
                        <p className="text-green-400 text-sm mt-2">✓ Asistencia confirmada</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {!reserva.confirmada && (
                        <Button
                          texto="Confirmar Asistencia"
                          onClick={() => handleConfirmar(reserva._id)}
                          variant="default"
                        />
                      )}
                      <Button
                        texto="Cancelar Reserva"
                        onClick={() => handleCancelar(reserva._id)}
                        variant="eliminar"
                      />
                    </div>
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
                  <li key={reserva._id} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-bold text-lg">{reserva.cancha}</p>
                        <p className="text-gray-300"><span className="font-semibold">Fecha:</span> {reserva.fecha}</p>
                        <p className="text-gray-300"><span className="font-semibold">Horario:</span> {reserva.horario}</p>
                      </div>
                      <span className="bg-green-800 text-green-300 text-xs font-medium px-2.5 py-1 rounded-full">
                        Realizado
                      </span>
                    </div>
                    
                    {/* Botón funcional para ver jugadores */}
                    <button 
                      onClick={() => handleVerJugadores(reserva)}
                      className="mt-3 text-yellow-400 hover:text-yellow-300 text-sm flex items-center"
                    >
                      <FiUsers className="mr-1" /> Ver jugadores
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Modal para ver jugadores */}
      <Modal isOpen={modalJugadoresAbierto} onClose={() => setModalJugadoresAbierto(false)}>
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-2">Jugadores</h3>
          <p className="text-gray-400 mb-4">
            {reservaSeleccionada?.cancha} - {reservaSeleccionada?.fecha} ({reservaSeleccionada?.horario})
          </p>
          
          {loadingJugadores ? (
            <p className="text-center text-gray-300 py-4">Cargando jugadores...</p>
          ) : jugadoresReserva.length === 0 ? (
            <p className="text-center text-gray-300 py-4">No hay jugadores registrados para esta reserva.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {jugadoresReserva.map(jugador => (
                <li key={jugador._id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{jugador.nombre} {jugador.apellido}</p>
                    <p className="text-gray-400 text-sm">@{jugador.username}</p>
                  </div>
                  
                  {/* Mostrar botón de calificar o "ya calificado" */}
                  {jugador.calificado ? (
                    <span className="text-green-400 text-sm flex items-center">
                      <FiStar className="mr-1" /> Calificado
                    </span>
                  ) : (
                    <Button
                      texto="Calificar"
                      onClick={() => handleCalificarJugador(jugador)}
                      variant="default"
                      className="text-sm py-1"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          
          <div className="mt-6 text-center">
            <Button
              texto="Cerrar"
              onClick={() => setModalJugadoresAbierto(false)}
              variant="cancelar"
            />
          </div>
        </div>
      </Modal>

      {/* Modal para calificar jugador */}
      <Modal isOpen={modalCalificacionAbierto} onClose={() => setModalCalificacionAbierto(false)}>
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Calificar jugador</h3>
          <p className="text-gray-300 mb-6">
            {jugadorSeleccionado?.nombre} {jugadorSeleccionado?.apellido}
          </p>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Calificación</label>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">1</span>
              <span className="text-gray-400">10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={calificacion}
              onChange={(e) => setCalificacion(parseInt(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="text-center mt-2">
              <span className="text-white text-xl font-bold">{calificacion}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Observaciones (opcional)</label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
              rows="3"
              placeholder="Añade comentarios sobre el jugador..."
            />
          </div>
          
          <div className="flex gap-4">
            <Button
              texto="Cancelar"
              onClick={() => setModalCalificacionAbierto(false)}
              variant="cancelar"
              className="flex-1"
            />
            <Button
              texto="Enviar Calificación"
              onClick={handleEnviarCalificacion}
              variant="default"
              className="flex-1"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MisReservas;