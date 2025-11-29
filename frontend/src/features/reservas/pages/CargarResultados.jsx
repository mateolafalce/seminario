import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../auth/context/AuthContext";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Navigate } from 'react-router-dom'; // Importar useNavigate
import MiToast from "../../../shared/components/ui/Toast/MiToast";
import ReservaCard from "../components/CardReserva";
import resultadosApi from "../../../shared/services/resultadosApi";
import backendClient from "../../../shared/services/backendClient";
import { canManageReservas } from '../../../shared/utils/permissions';
import { FiCalendar, FiEdit3, FiSave, FiArrowLeft } from "react-icons/fi"; // Nuevo icono

// --- ANIMACIÓN ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

// --- HELPERS ---
const getTodayISO = () => new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

// Convertir "YYYY-MM-DD" (input) -> "DD-MM-YYYY" (backend)
const formatToBackend = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
};

const derivePlayersCount = (r) => {
  if (Array.isArray(r.usuarios)) {
    const confirmados = r.usuarios.filter(u => u?.confirmado === true).length;
    if (confirmados > 0) return confirmados;
    if (r.usuarios.length > 0) return r.usuarios.length;
  }
  return r.cantidad_usuarios || 1;
};

function CargarResultados() {
  const navigate = useNavigate(); // Hook de navegación
  const { isAuthenticated, roles, permissions } = useContext(AuthContext);
  const me = { roles, permissions };
  const puedeCargar = canManageReservas(me) || permissions?.includes('reservas.resultado.cargar');

  // Estado del calendario (YYYY-MM-DD para el input)
  const [fechaInput, setFechaInput] = useState(getTodayISO());

  const [reservas, setReservas] = useState([]);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [resultado, setResultado] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !puedeCargar) return;

    let cancelled = false;
    const fetchReservas = async () => {
      setLoading(true);
      setSelectedReserva(null);
      setResultado("");
      
      try {
        // Convertimos al formato que espera el backend
        const fechaBackend = formatToBackend(fechaInput);
        const data = await backendClient.get("reservas/listar", { fecha: fechaBackend });
        
        const confirmadas = (data || []).filter(
          (r) => String(r.estado || "").toLowerCase() === "confirmada"
        );
        if (!cancelled) setReservas(confirmadas);
      } catch {
        if (!cancelled) setReservas([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReservas();
    return () => { cancelled = true; };
  }, [fechaInput, isAuthenticated, puedeCargar]);

  const handleSelectReserva = async (reserva) => {
    setSelectedReserva(reserva);
    setResultado("");
    try {
      const data = await resultadosApi.ver(reserva._id);
      const resTxt = data?.resultado || "";
      setResultado(resTxt);
      setSelectedReserva({ ...reserva, resultado: resTxt });
    } catch {
      setResultado("");
      setSelectedReserva({ ...reserva, resultado: "" });
    }
  };

  const handleCargarResultado = async () => {
    if (!selectedReserva || !resultado.trim()) {
      toast(<MiToast mensaje="Completa el resultado" color="var(--color-red-400)" />);
      return;
    }
    setSaving(true);
    try {
      await resultadosApi.cargar(selectedReserva._id, resultado.trim());
      toast(<MiToast mensaje="Guardado exitosamente" color="var(--color-green-400)" />);
      
      setReservas((prev) =>
        prev.map((r) => (r._id === selectedReserva._id ? { ...r, resultado: resultado.trim() } : r))
      );
      setSelectedReserva(null);
    } catch (err) {
      toast(<MiToast mensaje={err?.message || "Error al guardar"} color="var(--color-red-400)" />);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !puedeCargar) return <Navigate to="/" replace />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-h-[80vh]">
      
      {/* HEADER CON BOTÓN VOLVER */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex items-center gap-4 border-b border-gray-800 pb-6 mb-8"
      >
        <button 
            onClick={() => navigate("/panel-control/reservas")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            title="Volver a Reservas"
        >
            <FiArrowLeft size={24} />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiEdit3 className="text-yellow-400" /> Cargar Resultados
            </h2>
            <p className="text-slate-400 text-sm">Selecciona un partido confirmado para registrar el marcador.</p>
        </div>
      </motion.div>

      {/* SELECTOR DE FECHA (CALENDARIO) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 flex justify-center"
      >
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="text-slate-400 group-hover:text-yellow-400 transition-colors" />
            </div>
            <input
              type="date"
              max={getTodayISO()} // Bloquea fechas futuras
              value={fechaInput}
              onChange={(e) => setFechaInput(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:border-yellow-400 outline-none transition-colors cursor-pointer shadow-lg hover:bg-slate-800"
            />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: LISTA */}
        <motion.div 
            className="lg:col-span-7 space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {loading ? (
              <p className="text-center text-slate-500 py-10">Cargando partidos...</p>
            ) : reservas.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                  <p className="text-slate-400">No hay partidos confirmados para esta fecha.</p>
              </div>
            ) : (
              reservas.map((reserva) => {
                const isSelected = selectedReserva?._id === reserva._id;
                // Formateamos fecha visualmente si viene cruda
                const fechaVisual = reserva.fecha || formatToBackend(fechaInput);
                const reservaUI = { ...reserva, estado: "Confirmada", fecha: fechaVisual };
                const playersCount = derivePlayersCount(reserva);

                return (
                  <motion.div key={reserva._id} variants={itemVariants}>
                      <ReservaCard
                        variant="empleado"
                        selected={isSelected}
                        reserva={reservaUI}
                        playersCountOverride={playersCount}
                        onClick={() => handleSelectReserva(reserva)}
                        className={`cursor-pointer transition-all ${isSelected ? 'ring-1 ring-yellow-400 bg-slate-800' : 'hover:bg-slate-800/50'}`}
                      />
                  </motion.div>
                );
              })
            )}
        </motion.div>

        {/* COLUMNA DERECHA: PANEL DE EDICIÓN (Sticky) */}
        <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
                {selectedReserva ? (
                    <motion.div
                        key="editor"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl sticky top-6"
                    >
                        <h4 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">
                            {selectedReserva.resultado ? "Editar Resultado" : "Nuevo Resultado"}
                        </h4>
                        
                        <div className="space-y-3 mb-6 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Cancha</span>
                                <span className="text-white font-medium">{selectedReserva.cancha}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Horario</span>
                                <span className="text-white font-medium">{selectedReserva.horario}</span>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 mt-2">
                                <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Jugadores</span>
                                <p className="text-slate-300">{selectedReserva.usuario_nombre || "Sin nombres registrados"}</p>
                            </div>
                        </div>

                        <label className="block text-xs font-bold text-yellow-400 uppercase mb-2">Marcador Final</label>
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-yellow-400 outline-none transition-colors resize-none text-lg font-mono placeholder:text-slate-700"
                            rows={3}
                            placeholder="Ej: 6-4 / 6-2"
                            value={resultado}
                            onChange={(e) => setResultado(e.target.value)}
                            autoFocus
                        />

                        <div className="mt-6 flex gap-3">
                            <button 
                                onClick={() => setSelectedReserva(null)}
                                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCargarResultado}
                                disabled={saving}
                                className="flex-1 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-bold hover:bg-yellow-300 transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
                            >
                                {saving ? "Guardando..." : <><FiSave /> Guardar</>}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hidden lg:flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 bg-slate-900/30"
                    >
                        <FiEdit3 size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Selecciona un partido de la lista.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

export default CargarResultados;