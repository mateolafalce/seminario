import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from '../../auth/context/AuthContext';
import backendClient from '../../../shared/services/backendClient';
import Button from '../../../shared/components/ui/Button/Button';
import MessageConfirm from '../../../shared/components/ui/Confirm/MessageConfirm';
import { safeToast, errorToast, successToast } from '../../../shared/utils/apiHelpers';
import { FiSave, FiClock, FiCalendar, FiCheck, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
import { MdOutlineSportsTennis } from "react-icons/md";

// --- ANIMACIONES ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const LIMITE_PREFS = 7;

/* ------------------------------------------
   Utils (presets)
------------------------------------------- */
const parseHour = (bloque) => Number((String(bloque).split("-")[0] || "00:00").split(":")[0] || 0);
const gruposHorarios = (lista) => {
  const m = [], t = [], n = [];
  lista.forEach((h) => {
    const hh = parseHour(h);
    if (hh < 12) m.push(h);
    else if (hh < 18) t.push(h);
    else n.push(h);
  });
  return { m, t, n };
};

export default function Preferencia() {
  const { habilitado, loading } = useContext(AuthContext);
  
  // Estado Principal
  const [preferencias, setPreferencias] = useState({ dias: [], horarios: [], canchas: [] });
  const [preferenciasGuardadas, setPreferenciasGuardadas] = useState([]);
  const [preferenciaEditar, setPreferenciaEditar] = useState(null);
  
  // Datos Maestros
  const [canchasDisponibles, setCanchasDisponibles] = useState([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  
  // Confirmación
  const [confirmData, setConfirmData] = useState({ open: false, id: null });

  // 1. CARGA INICIAL
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingDatos(true);
        const [canchasData, horariosData] = await Promise.all([
            backendClient.get('canchas/listar'),
            backendClient.get('horarios/listar')
        ]);

        const nombresCanchas = (canchasData || []).map(c => c?.nombre).filter(Boolean);
        setCanchasDisponibles([...new Set(nombresCanchas)].sort((a, b) => a.localeCompare(b)));

        const arrHorarios = Array.isArray(horariosData) ? horariosData.map(h => (h?.hora ?? h)).filter(Boolean) : [];
        setHorariosDisponibles(arrHorarios);

        // Si ya está habilitado, cargar las guardadas
        if (habilitado) {
            const prefs = await backendClient.get('preferencias/obtener');
            setPreferenciasGuardadas(prefs || []);
        }
      } catch (error) {
        console.error(error);
        errorToast("Error al cargar datos.");
      } finally {
        setLoadingDatos(false);
      }
    };
    fetchData();
  }, [habilitado]);

  // --- LÓGICA DE SELECCIÓN ---
  const handleToggle = (key, item) => {
    setPreferencias((prev) => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter((i) => i !== item) : [...prev[key], item],
    }));
  };

  const toggleBulk = (key, list) => {
    setPreferencias(prev => {
      const prevSet = new Set(prev[key]);
      const allSelected = list.every(i => prevSet.has(i));
      const next = new Set(prev[key]);
      if (allSelected) list.forEach(i => next.delete(i));
      else            list.forEach(i => next.add(i));
      return { ...prev, [key]: Array.from(next) };
    });
  };

  // --- LÓGICA DE GUARDADO/EDICIÓN ---
  const resetConstructor = () => setPreferencias({ dias: [], horarios: [], canchas: [] });
  const reachedLimit = !preferenciaEditar && preferenciasGuardadas.length >= LIMITE_PREFS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preferencias.dias.length || !preferencias.horarios.length || !preferencias.canchas.length) {
      errorToast("Seleccioná al menos una opción de cada grupo.");
      return;
    }

    try {
      if (preferenciaEditar) {
        await backendClient.put(`preferencias/modificar/${preferenciaEditar.id}`, preferencias);
        successToast("Preferencia actualizada");
      } else {
        await backendClient.post('preferencias/guardar', preferencias);
        successToast("Guardado con éxito");
      }
      
      // Recargar lista
      const data = await backendClient.get('preferencias/obtener');
      setPreferenciasGuardadas(data);
      
      resetConstructor();
      setPreferenciaEditar(null);
    } catch (error) {
      errorToast(error.message || "No se pudo guardar");
    }
  };

  const handleModificarClick = (pref) => {
    setPreferenciaEditar(pref);
    setPreferencias({ dias: pref.dias, horarios: pref.horarios, canchas: pref.canchas });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- ELIMINACIÓN ---
  const handleEliminar = (id) => setConfirmData({ open: true, id });
  
  const confirmarEliminar = async () => {
    try {
      await backendClient.delete(`preferencias/eliminar/${confirmData.id}`);
      setPreferenciasGuardadas(prev => prev.filter(p => p.id !== confirmData.id));
      successToast("Eliminado.");
    } catch (e) { errorToast("Error al eliminar"); }
    setConfirmData({ open: false, id: null });
  };

  // CORRECCIÓN AQUÍ: Definimos la función para cerrar el modal
  const cancelarAccion = () => {
    setConfirmData({ open: false, id: null });
  };

  // Helpers para UI
  const { m, t, n } = gruposHorarios(horariosDisponibles);
  const presetLaborables = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const presetFinde = ["Sábado", "Domingo"];

  if (loadingDatos || loading) return <div className="min-h-[60vh] flex items-center justify-center text-slate-500">Cargando...</div>;
  if (!habilitado) return <div className="p-10 text-center text-red-400">Debes estar habilitado para configurar preferencias.</div>;

  return (
    <motion.div 
      className="max-w-7xl mx-auto p-4 md:p-8 min-h-[90vh]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      
      {/* HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
             {preferenciaEditar ? "Editando Preferencia" : "Mis Preferencias"}
             {preferenciaEditar && <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded">Modo Edición</span>}
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm">
            Configura tus alertas ideales. Te avisaremos cuando se libere un turno que coincida con tus gustos.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            {preferenciaEditar && (
                <Button texto="Cancelar" onClick={() => { setPreferenciaEditar(null); resetConstructor(); }} variant="secondary" icon={<FiX />} />
            )}
            <Button 
                texto={preferenciaEditar ? "Actualizar" : "Guardar Nueva"} 
                onClick={handleSubmit} 
                disabled={reachedLimit && !preferenciaEditar}
                variant="default" 
                icon={<FiSave />} 
                className="shadow-lg shadow-yellow-400/20 flex-1 md:flex-none justify-center"
            />
        </div>
      </motion.div>

      {reachedLimit && !preferenciaEditar && (
        <motion.div variants={itemVariants} className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-sm text-center">
            Has alcanzado el límite de {LIMITE_PREFS} preferencias. Edita o elimina una existente para crear otra.
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- COLUMNA IZQUIERDA: CONFIGURADOR (7 cols) --- */}
        <div className="lg:col-span-7 space-y-6">
            
            {/* 1. DÍAS */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-700/60 p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><FiCalendar className="text-yellow-400"/> Días</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {diasSemana.map((dia) => {
                        const active = preferencias.dias.includes(dia);
                        return (
                            <button
                                key={dia}
                                onClick={() => handleToggle("dias", dia)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${active ? 'bg-yellow-400 text-slate-900 border-yellow-400 shadow-md transform scale-105' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'}`}
                            >
                                {dia}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* 2. HORARIOS */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-700/60 p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><FiClock className="text-yellow-400"/> Horarios</h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {horariosDisponibles.map((h) => {
                        const active = preferencias.horarios.includes(h);
                        return (
                            <button
                                key={h}
                                onClick={() => handleToggle("horarios", h)}
                                className={`py-1.5 px-1 rounded text-xs font-bold transition-all border text-center ${active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                            >
                                {h}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* 3. CANCHAS */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-700/60 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MdOutlineSportsTennis className="text-yellow-400"/> Canchas</h3>
                <div className="flex flex-wrap gap-2">
                    {canchasDisponibles.map((c) => {
                        const active = preferencias.canchas.includes(c);
                        return (
                            <button
                                key={c}
                                onClick={() => handleToggle("canchas", c)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 ${active ? 'bg-slate-800 border-yellow-400 text-white ring-1 ring-yellow-400/30' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                            >
                                {c} {active && <FiCheck className="text-yellow-400"/>}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

        </div>

        {/* --- COLUMNA DERECHA: LISTA GUARDADA (5 cols) --- */}
        <motion.div variants={itemVariants} className="lg:col-span-5">
            <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl h-full sticky top-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    Mis Configuraciones ({preferenciasGuardadas.length})
                </h3>
                
                {preferenciasGuardadas.length === 0 ? (
                    <div className="text-center py-10 text-slate-600 italic border-2 border-dashed border-slate-800 rounded-xl">
                        No tienes alertas configuradas.
                    </div>
                ) : (
                    <ul className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence>
                            {preferenciasGuardadas.map((pref) => (
                                <motion.li 
                                    key={pref.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className={`p-4 rounded-xl border transition-all relative group ${preferenciaEditar?.id === pref.id ? 'bg-yellow-400/5 border-yellow-400/30' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="space-y-2 text-sm text-slate-300">
                                        <div><span className="text-slate-500 text-xs uppercase font-bold">Días:</span> <span className="text-white">{pref.dias.join(", ")}</span></div>
                                        <div><span className="text-slate-500 text-xs uppercase font-bold">Horas:</span> {pref.horarios.join(", ")}</div>
                                        <div><span className="text-slate-500 text-xs uppercase font-bold">Canchas:</span> {pref.canchas.join(", ")}</div>
                                    </div>
                                    
                                    {/* Acciones flotantes */}
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleModificarClick(pref)} className="p-1.5 bg-yellow-400 text-slate-900 rounded hover:bg-yellow-300" title="Editar"><FiEdit2 size={14}/></button>
                                        <button onClick={() => handleEliminar(pref.id)} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600" title="Eliminar"><FiTrash2 size={14}/></button>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </div>
        </motion.div>

      </div>

      {/* MODAL CONFIRMACIÓN */}
      {confirmData.open && (
        <MessageConfirm
          mensaje="¿Eliminar esta configuración de preferencias?"
          onClose={cancelarAccion}
          onConfirm={confirmarEliminar}
          onCancel={cancelarAccion}
        />
      )}
    </motion.div>
  );
}