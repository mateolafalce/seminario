// src/pages/MisReservas.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import Modal from '../components/common/Modal/Modal';
import { FiUsers, FiStar, FiCalendar, FiClock, FiList } from 'react-icons/fi';
import FormularioReseña from '../components/usuarios/FormularioResenias';
import ReservaCard, { EmptyState } from '../components/common/Cards/CardReserva';
import MessageConfirm from '../components/common/Confirm/MessageConfirm';
import { safeToast } from '../utils/apiHelpers';
import backendClient from '../services/backendClient';           // 👈 nuevo

const ACCENT = '#FFC107';
const cn = (...x) => x.filter(Boolean).join(' ');

function TabButton({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={cn('relative pb-3 text-sm font-medium transition',
        active ? 'text-white' : 'text-white/60 hover:text-white')}
    >
      <span className="inline-flex items-center gap-2">
        {icon} {label}
        <span className="rounded-full bg-white/10 px-2 text-xs">{count}</span>
      </span>
      {active && <span className="absolute -bottom-[1px] left-0 right-0 h-0.5" style={{ backgroundColor: ACCENT }} />}
    </button>
  );
}

function MisReservas() {
  const { isAuthenticated, user } = useContext(AuthContext);

  const [vista, setVista] = useState('proximos');
  const [proximasReservas, setProximasReservas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // jugadores / calificación
  const [modalJugadoresAbierto, setModalJugadoresAbierto] = useState(false);
  const [jugadoresReserva, setJugadoresReserva] = useState([]);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [loadingJugadores, setLoadingJugadores] = useState(false);
  const [modalCalificacionAbierto, setModalCalificacionAbierto] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [detalleReserva, setDetalleReserva] = useState(null);

  // Confirmación al cancelar
  const [confirmData, setConfirmData] = useState({ open: false, id: null });

  // 🔧 Centralizamos la carga en una función reutilizable
  const cargarListas = useCallback(async (signal) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [listaProx, listaHist] = await Promise.all([
        backendClient.get('reservas/mis-reservas', {
          estados: 'Reservada,Confirmada',
          incluir_pasadas: 'false',
        }, { signal }),
        backendClient.get('reservas/mis-reservas', {
          estados: 'Confirmada,Completada,Cancelada',
          incluir_pasadas: 'true',
        }, { signal }),
      ]);

      setProximasReservas(Array.isArray(listaProx) ? listaProx : []);
      setHistorial(Array.isArray(listaHist) ? listaHist : []);
    } catch (e) {
      if (signal?.aborted) return;
      const msg = e?.message || 'No se pudieron cargar tus reservas.';
      setErrorMsg(msg);
      safeToast(msg, '#F43F5E');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [isAuthenticated]);

  // Carga inicial usando la función
  useEffect(() => {
    const ac = new AbortController();
    cargarListas(ac.signal);
    return () => ac.abort();
  }, [cargarListas]);

  async function handleConfirmar(id) {
    try {
      const data = await backendClient.post(`reservas/confirmar/${id}`); // POST /api/reservas/confirmar/:id
      safeToast(data?.msg || 'Asistencia confirmada.');
      await cargarListas();
    } catch (e) {
      safeToast(e?.message || 'No se pudo confirmar', '#F43F5E');
    }
  }

  async function handleVerJugadores(reserva) {
    setReservaSeleccionada(reserva);
    setLoadingJugadores(true);
    setModalJugadoresAbierto(true);
    const ac = new AbortController();
    try {
      const detalle = await backendClient.get('reservas/detalle', {
        cancha: reserva.cancha,
        horario: reserva.horario,
        fecha: reserva.fecha,
        ...(user?.id ? { usuario_id: user.id } : {}),
      }, { signal: ac.signal });
      setDetalleReserva(detalle);
      const usuarios = (detalle?.usuarios || [])
        .filter(u => u.usuario_id !== user?.id)
        .map(u => ({
          _id: u.usuario_id,
          nombre: u.nombre,
          apellido: u.apellido,
          username: u.username || '',
          calificado: !!u.calificado,
        }));
      setJugadoresReserva(usuarios);
    } catch (e) {
      if (ac.signal.aborted) return;
      safeToast(e?.message || 'No se pudieron obtener los jugadores', '#F43F5E');
      setJugadoresReserva([]);
    } finally {
      setLoadingJugadores(false);
    }
  }

  function handleCalificarJugador(j) { setJugadorSeleccionado(j); setModalCalificacionAbierto(true); }
  function handleReseñaExitosa() {
    setJugadoresReserva(prev => prev.map(x => x._id === jugadorSeleccionado._id ? { ...x, calificado: true } : x));
    setModalCalificacionAbierto(false);
    setJugadorSeleccionado(null);
  }

  const counts = useMemo(() => ({
    proximos: proximasReservas.length,
    historial: historial.length
  }), [proximasReservas.length, historial.length]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <p className="text-red-400">Debes iniciar sesión para ver tus reservas.</p>
      </div>
    );
  }

  function handleCancelar(id) { setConfirmData({ open: true, id }); }

  async function confirmarCancelacion() {
    const id = confirmData.id;
    setConfirmData({ open: false, id: null });
    try {
      const data = await backendClient.delete(`reservas/cancelar/${id}`); // DELETE /api/reservas/cancelar/:id
      safeToast(data?.msg || 'Reserva cancelada.');
      await cargarListas();
    } catch (e) {
      safeToast(e?.message || 'No se pudo cancelar', '#F43F5E');
    }
  }
  function cancelarAccion() { setConfirmData({ open: false, id: null }); }

  return (
    <div className="min-h-[70vh] py-8 px-4">
      <div className="mx-auto w-full max-w-5xl">
        {/* Tabs */}
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-white/10">
          <div className="flex gap-6">
            <TabButton active={vista === 'proximos'} onClick={() => setVista('proximos')} icon={<FiCalendar />} label="Próximas" count={counts.proximos} />
            <TabButton active={vista === 'historial'} onClick={() => setVista('historial')} icon={<FiList />} label="Historial" count={counts.historial} />
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Listas */}
        {loading ? (
          <p className="text-white/70">Cargando…</p>
        ) : vista === 'proximos' ? (
          proximasReservas.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center max-w-3xl mx-auto">
              <EmptyState />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-8 lg:gap-0 max-w-5xl w-full">
              {proximasReservas.map((reserva) => (
                <li key={reserva._id}>
                  <ReservaCard
                    reserva={reserva}
                    mode="proxima"
                    onConfirmarAsistencia={handleConfirmar}
                    onCancelar={handleCancelar}
                  />
                </li>
              ))}
            </ul>
          )
        ) : historial.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center max-w-3xl mx-auto">
            <EmptyState />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-8 lg:gap-0 max-w-5xl w-full">
            {historial.map((reserva) => (
              <li key={reserva._id}>
                <ReservaCard
                  reserva={reserva}
                  mode="historial"
                  onVerJugadores={handleVerJugadores}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Jugadores */}
      <Modal isOpen={modalJugadoresAbierto} onClose={() => setModalJugadoresAbierto(false)}>
        <div className="p-4 sm:p-6">
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <FiUsers /> Jugadores
          </h3>
          <p className="text-white/60 mb-4 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1"><FiCalendar /> {reservaSeleccionada?.fecha}</span>
            <span className="inline-flex items-center gap-1"><FiClock /> {reservaSeleccionada?.horario}</span>
            <span>{reservaSeleccionada?.cancha}</span>
          </p>

          {loadingJugadores ? (
            <div className="text-white/70">Cargando…</div>
          ) : jugadoresReserva.length === 0 ? (
            <p className="text-center text-white/70 py-4">No hay jugadores registrados.</p>
          ) : (
            <ul className="divide-y divide-white/10 rounded-lg border border-white/10 overflow-hidden">
              {jugadoresReserva.map((j) => (
                <li key={j._id} className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{j.nombre} {j.apellido}</p>
                    {j.username && <p className="text-white/60 text-sm">@{j.username}</p>}
                  </div>
                  {j.calificado ? (
                    <span className="text-emerald-400 text-xs inline-flex items-center gap-1"><FiStar /> Calificado</span>
                  ) : (
                    <Button
                      texto="Calificar"
                      onClick={() => handleCalificarJugador(j)}
                      variant="default"
                      className="!bg-transparent !text-yellow-300 !border !border-yellow-300/40 hover:!bg-yellow-300/10 text-sm py-1"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex justify-end">
            <Button texto="Cerrar" onClick={() => setModalJugadoresAbierto(false)} variant="cancelar" />
          </div>
        </div>
      </Modal>

      {/* Modal Calificación */}
      <Modal isOpen={modalCalificacionAbierto} onClose={() => setModalCalificacionAbierto(false)}>
        <div className="p-4 sm:p-6">
          {jugadorSeleccionado ? (
            <FormularioReseña
              jugadorAReseñar={jugadorSeleccionado}
              reservaId={detalleReserva?.reserva_id}
              onReseñaEnviada={handleReseñaExitosa}
              onCancelar={() => setModalCalificacionAbierto(false)}
            />
          ) : (
            <div className="text-white/70">Cargando…</div>
          )}
        </div>
      </Modal>

      {confirmData.open && (
        <MessageConfirm
          mensaje="¿Seguro que deseas cancelar esta reserva?"
          onClose={cancelarAccion}
          onConfirm={confirmarCancelacion}
          onCancel={cancelarAccion}
        />
      )}
    </div>
  );
}

export default MisReservas;
