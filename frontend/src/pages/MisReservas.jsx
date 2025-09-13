import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import MiToast from '../components/common/Toast/MiToast';
import { toast } from "react-toastify";
import Modal from '../components/common/Modal/Modal';
import { FiUsers, FiStar } from 'react-icons/fi';
import FormularioReseña from '../components/usuarios/FormularioResenias';
import HistorialReservas from '../components/usuarios/HistorialReservas';
import ProximaReservaItem from '../components/usuarios/ProximaReservaItem';

function safeToast(message, color = "var(--color-red-400)") {
  toast(<MiToast mensaje={message} color={color} />);
}

async function safeJson(resp) {
  try { return await resp.json(); } catch { return {}; }
}

function MisReservas() {
  const [vista, setVista] = useState('proximos');
  const [proximasReservas, setProximasReservas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, apiFetch, user } = useContext(AuthContext);

  // Modal jugadores
  const [modalJugadoresAbierto, setModalJugadoresAbierto] = useState(false);
  const [jugadoresReserva, setJugadoresReserva] = useState([]);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [loadingJugadores, setLoadingJugadores] = useState(false);

  // Calificación
  const [modalCalificacionAbierto, setModalCalificacionAbierto] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);

  // Nuevo estado para guardar el detalle completo de la reserva
  const [detalleReserva, setDetalleReserva] = useState(null);

  // antes: solo Reservada
  // const urlProximas = '/api/reservas/mis-reservas?estados=Reservada&incluir_pasadas=false';

  // ahora: Reservada + Confirmada
  const urlProximas = '/api/reservas/mis-reservas?estados=Reservada,Confirmada&incluir_pasadas=false';
  const urlHistorial = '/api/reservas/mis-reservas?estados=Confirmada,Completada,Cancelada&incluir_pasadas=true';

  async function cargarListas() {
    setLoading(true);
    try {
      const [resProx, resHist] = await Promise.all([
        apiFetch(urlProximas),
        apiFetch(urlHistorial),
      ]);

      if (resProx.ok) {
        const data = await resProx.json();
        setProximasReservas(Array.isArray(data) ? data : []);
      } else {
        const e = await safeJson(resProx);
        safeToast(e.detail || "No se pudieron cargar tus próximas reservas.");
      }

      if (resHist.ok) {
        const data = await resHist.json();
        setHistorial(Array.isArray(data) ? data : []);
      } else {
        const e = await safeJson(resHist);
        safeToast(e.detail || "No se pudo cargar el historial de reservas.");
      }
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        console.error("Error al obtener las reservas:", error);
        safeToast("No se pudieron cargar tus reservas.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    cargarListas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function handleCancelar(reservaId) {
    if (!window.confirm("¿Estás seguro de que quieres cancelar esta reserva?")) return;
    try {
      const response = await apiFetch(`/api/reservas/cancelar/${reservaId}`, { method: 'DELETE' });
      const data = await safeJson(response);
      if (response.ok) {
        safeToast(data.msg || "Reserva cancelada.", "[#e5ff00]");
        // Re-fetch de ambas listas para mantener consistencia
        await cargarListas();
      } else {
        safeToast(`Error: ${data.detail || 'No se pudo cancelar'}`);
      }
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        safeToast("Error de conexión al intentar cancelar la reserva.");
      }
    }
  }

  async function handleConfirmar(reservaId) {
    try {
      const response = await apiFetch(`/api/reservas/confirmar/${reservaId}`, { method: 'POST' });
      const data = await safeJson(response);

      if (response.ok) {
        safeToast(data.msg || "Asistencia registrada.", "[#e5ff00]");
        // Re-fetch de próximas + historial (si pasó a Confirmada/Completada se verá donde corresponda)
        await cargarListas();
      } else {
        safeToast(`Error: ${data.detail || 'No se pudo confirmar la asistencia'}`);
      }
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        safeToast("Error de conexión");
      }
    }
  }

  async function handleVerJugadores(reserva) {
    setReservaSeleccionada(reserva);
    setLoadingJugadores(true);
    setModalJugadoresAbierto(true);

    try {
      const qs = new URLSearchParams({
        cancha: reserva.cancha,
        horario: reserva.horario,
        fecha: reserva.fecha,
        usuario_id: user?.id || ''
      });
      const response = await apiFetch(`/api/reservas/detalle?${qs.toString()}`);
      const data = await safeJson(response);

      if (response.ok) {
        setDetalleReserva(data); // guarda el detalle completo, incluyendo reserva_id
        const usuarios = (data.usuarios || [])
          .filter(u => u.usuario_id !== user?.id) // no mostrarme a mí para calificarme
          .map(u => ({
            _id: u.usuario_id,
            nombre: u.nombre,
            apellido: u.apellido,
            username: u.username || "",
            calificado: !!u.calificado,
          }));
        setJugadoresReserva(usuarios);
      } else {
        safeToast(data.detail || "No se pudieron obtener los jugadores");
        setJugadoresReserva([]);
      }
    } catch (error) {
      safeToast("Error al cargar los jugadores");
      setJugadoresReserva([]);
    } finally {
      setLoadingJugadores(false);
    }
  }

  function handleCalificarJugador(jugador) {
    setJugadorSeleccionado(jugador);
    setModalCalificacionAbierto(true);
  }

  function handleReseñaExitosa() {
    setJugadoresReserva(prev =>
      prev.map(j => j._id === jugadorSeleccionado._id ? { ...j, calificado: true } : j)
    );
    setModalCalificacionAbierto(false);
    setJugadorSeleccionado(null);
  }

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

        {/* Botones de vista */}
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

        {/* Contenido */}
        {vista === 'proximos' ? (                              
          <div>
            {proximasReservas.length === 0 ? (
              <p className="text-gray-300 text-center">No tienes ninguna reserva activa.</p>
            ) : (
              <ul className="space-y-4">
                {proximasReservas.map((reserva) => (
                  <ProximaReservaItem
                    key={reserva._id}
                    reserva={reserva}
                    onConfirmar={handleConfirmar}
                    onCancelar={handleCancelar}
                    // si querés ver jugadores desde próximas:
                    onVerJugadores={() => handleVerJugadores(reserva)}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <HistorialReservas
            historial={historial}
            onVerJugadores={handleVerJugadores}
            // si querés permitir confirmar desde historial (no suele aplicar):
            // onConfirmarAsistencia={({ _id }) => handleConfirmar(_id)}
          />
        )}
      </div>

      {/* Modal Jugadores */}
      <Modal isOpen={modalJugadoresAbierto} onClose={() => setModalJugadoresAbierto(false)}>
        <div className="px-1 py-3 sm:p-6">
          <h3 className="text-2xl font-bold text-white mb-2">Jugadores</h3>
          <p className="text-gray-400 mb-4">
            {reservaSeleccionada?.cancha} — {reservaSeleccionada?.fecha} ({reservaSeleccionada?.horario})
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
                    {jugador.username ? (
                      <p className="text-gray-400 text-sm">@{jugador.username}</p>
                    ) : null}
                  </div>

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

      {/* Modal Calificación */}
      <Modal isOpen={modalCalificacionAbierto} onClose={() => setModalCalificacionAbierto(false)}>
        {jugadorSeleccionado && (
          <FormularioReseña
            jugadorAReseñar={jugadorSeleccionado}
            reservaId={detalleReserva?.reserva_id}   // <-- clave para validar en backend
            onReseñaEnviada={handleReseñaExitosa}
            onCancelar={() => setModalCalificacionAbierto(false)}
          />
        )}
      </Modal>
    </div>
  );
}

export default MisReservas;
