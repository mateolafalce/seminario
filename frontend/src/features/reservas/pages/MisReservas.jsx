import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../auth/context/AuthContext';
import { motion, AnimatePresence } from "framer-motion"; // <---
import Button from '../../../shared/components/ui/Button/Button';
import Modal from '../../../shared/components/ui/Modal/Modal';
import { FiUsers, FiStar, FiCalendar, FiClock, FiList } from 'react-icons/fi';
import FormularioReseña from '../../resenias/components/FormularioResenias';
import ReservaCard, { EmptyState } from '../components/CardReserva';
import MessageConfirm from '../../../shared/components/ui/Confirm/MessageConfirm';
import { safeToast } from '../../../shared/utils/apiHelpers';
import backendClient from '../../../shared/services/backendClient';

// Animaciones
const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const cardVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

function TabButton({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`relative pb-3 text-sm font-medium transition-colors flex items-center gap-2 ${active ? 'text-yellow-400' : 'text-slate-400 hover:text-slate-200'}`}
    >
      {icon} {label}
      {count > 0 && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{count}</span>}
      {active && (
        <motion.div 
            layoutId="activeTab" 
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-full" 
        />
      )}
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

  // Modales
  const [modalJugadoresAbierto, setModalJugadoresAbierto] = useState(false);
  const [jugadoresReserva, setJugadoresReserva] = useState([]);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [loadingJugadores, setLoadingJugadores] = useState(false);
  const [modalCalificacionAbierto, setModalCalificacionAbierto] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [detalleReserva, setDetalleReserva] = useState(null);
  const [confirmData, setConfirmData] = useState({ open: false, id: null });

  const cargarListas = useCallback(async (signal) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [listaProx, listaHist] = await Promise.all([
        backendClient.get('reservas/mis-reservas', { estados: 'Reservada,Confirmada', incluir_pasadas: 'false' }, { signal }),
        backendClient.get('reservas/mis-reservas', { estados: 'Confirmada,Completada,Cancelada', incluir_pasadas: 'true' }, { signal }),
      ]);
      setProximasReservas(Array.isArray(listaProx) ? listaProx : []);
      setHistorial(Array.isArray(listaHist) ? listaHist : []);
    } catch (e) {
      if (!signal?.aborted) setErrorMsg("Error al cargar reservas.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const ac = new AbortController();
    cargarListas(ac.signal);
    return () => ac.abort();
  }, [cargarListas]);

  async function handleConfirmar(id) {
    try {
      const data = await backendClient.post(`reservas/confirmar/${id}`);
      safeToast(data?.msg || 'Asistencia confirmada.');
      await cargarListas();
    } catch (e) { safeToast(e?.message, '#F43F5E'); }
  }

  async function handleVerJugadores(reserva) {
    setReservaSeleccionada(reserva);
    setLoadingJugadores(true);
    setModalJugadoresAbierto(true);
    try {
      const detalle = await backendClient.get('reservas/detalle', {
        cancha: reserva.cancha, horario: reserva.horario, fecha: reserva.fecha, ...(user?.id ? { usuario_id: user.id } : {})
      });
      setDetalleReserva(detalle);
      const usuarios = (detalle?.usuarios || []).filter(u => u.usuario_id !== user?.id);
      setJugadoresReserva(usuarios);
    } catch { setJugadoresReserva([]); } finally { setLoadingJugadores(false); }
  }

  function handleCalificarJugador(j) { setJugadorSeleccionado(j); setModalCalificacionAbierto(true); }
  
  function handleReseñaExitosa() {
    setJugadoresReserva(prev => prev.map(x => x.usuario_id === jugadorSeleccionado.usuario_id ? { ...x, calificado: true } : x));
    setModalCalificacionAbierto(false);
  }

  function handleCancelar(id) { setConfirmData({ open: true, id }); }
  async function confirmarCancelacion() {
    try {
      await backendClient.delete(`reservas/cancelar/${confirmData.id}`);
      safeToast('Reserva cancelada.');
      await cargarListas();
    } catch { safeToast('Error al cancelar', '#F43F5E'); }
    setConfirmData({ open: false, id: null });
  }

  const activeList = vista === 'proximos' ? proximasReservas : historial;

  return (
    <div className="min-h-[85vh] bg-slate-950 py-10 px-4">
      <div className="mx-auto w-full max-w-4xl">
        
        {/* TABS */}
        <div className="flex gap-8 mb-8 border-b border-slate-800">
            <TabButton active={vista === 'proximos'} onClick={() => setVista('proximos')} icon={<FiCalendar />} label="Próximas" count={proximasReservas.length} />
            <TabButton active={vista === 'historial'} onClick={() => setVista('historial')} icon={<FiList />} label="Historial" count={historial.length} />
        </div>

        {/* LISTA ANIMADA */}
        {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando...</div>
        ) : activeList.length === 0 ? (
            <EmptyState />
        ) : (
            <motion.ul 
                key={vista} // Fuerza re-animación al cambiar tab
                variants={listVariants} 
                initial="hidden" 
                animate="visible" 
                className="grid gap-4"
            >
                {activeList.map((reserva) => (
                    <motion.li key={reserva._id} variants={cardVariants}>
                        <ReservaCard
                            reserva={reserva}
                            mode={vista === 'proximos' ? 'proxima' : 'historial'}
                            onConfirmarAsistencia={handleConfirmar}
                            onCancelar={handleCancelar}
                            onVerJugadores={handleVerJugadores}
                        />
                    </motion.li>
                ))}
            </motion.ul>
        )}
      </div>

      {/* MODAL JUGADORES */}
      <Modal isOpen={modalJugadoresAbierto} onClose={() => setModalJugadoresAbierto(false)}>
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FiUsers className="text-yellow-400"/> Jugadores del Partido</h3>
          
          {loadingJugadores ? (
            <p className="text-slate-500">Cargando...</p>
          ) : jugadoresReserva.length === 0 ? (
            <p className="text-slate-500 italic">No hay otros jugadores.</p>
          ) : (
            <ul className="space-y-3">
              {jugadoresReserva.map((j, i) => (
                <li key={i} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <div>
                    <p className="text-slate-200 font-medium">{j.nombre} {j.apellido}</p>
                    <p className="text-xs text-slate-500">Jugador</p>
                  </div>
                  {j.calificado ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1"><FiCheckCircle/> Calificado</span>
                  ) : (
                    <button onClick={() => handleCalificarJugador(j)} className="text-xs border border-yellow-400/30 text-yellow-400 px-3 py-1 rounded hover:bg-yellow-400/10">Calificar</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex justify-end">
            <button onClick={() => setModalJugadoresAbierto(false)} className="text-slate-400 hover:text-white text-sm">Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* MODAL CALIFICACIÓN */}
      <Modal isOpen={modalCalificacionAbierto} onClose={() => setModalCalificacionAbierto(false)}>
        <div className="p-6">
            {jugadorSeleccionado && (
                <FormularioReseña
                    jugadorAReseñar={{...jugadorSeleccionado, _id: jugadorSeleccionado.usuario_id}}
                    reservaId={detalleReserva?.reserva_id}
                    onReseñaEnviada={handleReseñaExitosa}
                    onCancelar={() => setModalCalificacionAbierto(false)}
                />
            )}
        </div>
      </Modal>

      {/* CONFIRMACIÓN */}
      {confirmData.open && (
        <MessageConfirm
          mensaje="¿Seguro que deseas cancelar? No podrás deshacer esta acción."
          onClose={() => setConfirmData({open: false, id: null})}
          onConfirm={confirmarCancelacion}
          onCancel={() => setConfirmData({open: false, id: null})}
        />
      )}
    </div>
  );
}

export default MisReservas;