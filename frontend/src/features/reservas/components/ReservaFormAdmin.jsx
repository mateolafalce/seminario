import { useState, useEffect, useMemo } from "react";
import Button from "../../../shared/components/ui/Button/Button";
import adminApi from "../../../shared/services/adminApi";
import { listarCanchas, listarHorarios, buscarUsuariosAdmin } from "../../../shared/services/adminApi";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";
import { FiCalendar, FiClock, FiCheck, FiPlus, FiX } from "react-icons/fi";

const dateToYMD = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : "");
const inputToDate = (val) => {
  if (!val) return null;
  const [y, m, d] = val.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
};
const todayYMD = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
};
const dateToDMY = (d) => {
  if (!(d instanceof Date)) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

export default function ReservaFormAdmin({ onSubmit, loading = false }) {
  const [form, setForm] = useState({ fecha: null, cancha_id: '', horario_id: '' });
  const [canchas, setCanchas] = useState([]);
  const [horariosGlobales, setHorariosGlobales] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [userSugs, setUserSugs] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [reservasDelDia, setReservasDelDia] = useState([]);

  // Capacidad dinámica según la cancha seleccionada
  const canchaSeleccionada = useMemo(
    () => canchas.find((c) => c.id === form.cancha_id),
    [canchas, form.cancha_id]
  );
  const capacidadMaxima = canchaSeleccionada?.capacidad_maxima ?? 6;

  useEffect(() => {
    (async () => {
      try {
        const [cs, hs] = await Promise.all([listarCanchas(), listarHorarios()]);
        setCanchas(cs);
        setHorariosGlobales(hs);
      } catch (e) { toast(<MiToast mensaje='Error cargando datos' color="#ef4444" />); }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!userQuery.trim()) { setUserSugs([]); return; }
      const sugs = await buscarUsuariosAdmin(userQuery);
      const selectedIds = new Set(selectedUsers.map(s => s.id));
      setUserSugs(sugs.filter(s => !selectedIds.has(s.id)).slice(0, 8));
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery, selectedUsers]);

  useEffect(() => {
    if (!form.fecha || !form.cancha_id) {
        setReservasDelDia([]);
        return;
    }
    const fetchDisponibilidad = async () => {
        try {
            const canchaObj = canchas.find(c => c.id === form.cancha_id);
            const resp = await adminApi.reservas.adminSearch({
                fecha: dateToDMY(form.fecha),
                cancha: canchaObj?.nombre,
                limit: 100
            });
            setReservasDelDia(resp.reservas || []);
        } catch (e) { console.error(e); }
    };
    fetchDisponibilidad();
  }, [form.fecha, form.cancha_id, canchas]);

  const horariosRenderizables = useMemo(() => {
    if (!form.cancha_id) return [];
    const cancha = canchas.find(c => c.id === form.cancha_id);
    if (!cancha) return [];
    
    const idsHabilitados = (cancha.horarios || []).map(String); // Forzamos a array de strings
    
    const misHorarios = horariosGlobales.filter(h => idsHabilitados.includes(String(h.id)));

    return misHorarios.map(h => {
        const ocupado = reservasDelDia.some(r => {
            // Comparar por hora string (ej: "15:00") ya que los IDs pueden variar en reservas viejas
            const horaCoincide = (r.hora_inicio === h.hora) || (r.horario === h.hora);
            return horaCoincide && r.estado_nombre !== 'Cancelada';
        });
        return { ...h, ocupado };
    });
  }, [form.cancha_id, canchas, horariosGlobales, reservasDelDia]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fecha) return toast(<MiToast mensaje="Falta fecha" color="#ef4444" />);
    if (!form.cancha_id || !form.horario_id) return toast(<MiToast mensaje="Falta cancha/horario" color="#ef4444" />);
    if (!selectedUsers.length) return toast(<MiToast mensaje="Faltan usuarios" color="#ef4444" />);

    onSubmit({
      fecha: form.fecha,
      cancha_id: form.cancha_id,
      horario_id: form.horario_id,
      usuarios: selectedUsers.map(u => u.id),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
         <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
            <h3 className="text-white font-bold border-b border-slate-700 pb-2 flex items-center gap-2"><FiCalendar className="text-yellow-400"/> 1. ¿Cuándo y Dónde?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Fecha</label>
                    <input type="date" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-yellow-400 outline-none" value={dateToYMD(form.fecha)} min={todayYMD()} onChange={(e) => setForm(f => ({ ...f, fecha: inputToDate(e.target.value) }))} onClick={(e) => e.target.showPicker?.()} />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Cancha</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-yellow-400 outline-none" value={form.cancha_id} onChange={e => setForm(f => ({ ...f, cancha_id: e.target.value, horario_id: '' }))}>
                        <option value="">Seleccionar...</option>
                        {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
            </div>
         </div>

         {form.fecha && form.cancha_id && (
             <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
                <h3 className="text-white font-bold border-b border-slate-700 pb-2 flex items-center gap-2"><FiClock className="text-yellow-400"/> 2. Horario</h3>
                {horariosRenderizables.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-4">Esta cancha no tiene horarios habilitados.</div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {horariosRenderizables.map(h => (
                            <button key={h.id} type="button" disabled={h.ocupado} onClick={() => setForm(p => ({ ...p, horario_id: h.id }))}
                                className={`px-2 py-2 rounded text-sm border flex items-center justify-center gap-1 ${h.ocupado ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' : form.horario_id === h.id ? 'bg-yellow-500 text-black border-yellow-500 font-bold' : 'bg-slate-900 text-white border-slate-600 hover:border-yellow-400'}`}>
                                {h.hora} {h.ocupado && <span className="text-[10px] text-red-500 font-bold">X</span>} {!h.ocupado && form.horario_id === h.id && <FiCheck size={12}/>}
                            </button>
                        ))}
                    </div>
                )}
             </div>
         )}
      </div>

      <div className="space-y-6">
         <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4 h-full flex flex-col">
             <h3 className="text-white font-bold border-b border-slate-700 pb-2 flex items-center gap-2"><span className="text-yellow-400">3.</span> Jugadores</h3>
             <div className="relative">
                <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Buscar usuario..." className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-yellow-400 outline-none" />
                {userSugs.length > 0 && (
                    <ul className="absolute w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 max-h-40 overflow-auto mt-1">
                        {userSugs.map(s => (
                            <li key={s.id} className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-gray-200 border-b border-gray-700 last:border-0 flex justify-between" onClick={() => { 
                              if (selectedUsers.length >= capacidadMaxima) {
                                return toast(
                                  <MiToast 
                                    mensaje={`La cancha admite como máximo ${capacidadMaxima} jugadores.`} 
                                    color="#ef4444" 
                                  />
                                );
                              }
                              setSelectedUsers((p) => [...p, s]);
                              setUserQuery("");
                              setUserSugs([]);
                            }}>
                                <span>{s.label}</span><FiPlus/>
                            </li>
                        ))}
                    </ul>
                )}
             </div>
             <div className="flex-1 flex flex-col gap-2">
                {selectedUsers.length === 0 && <div className="text-center text-gray-500 text-sm italic mt-4">Agrega jugadores...</div>}
                {selectedUsers.map(u => (
                    <div key={u.id} className="flex justify-between bg-slate-700/30 px-3 py-2 rounded border border-slate-600 text-gray-200 text-sm">
                        <span>{u.label}</span>
                        <button type="button" onClick={() => setSelectedUsers(p => p.filter(x => x.id !== u.id))} className="text-red-400 hover:text-red-300"><FiX/></button>
                    </div>
                ))}
                {selectedUsers.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    {selectedUsers.length} / {capacidadMaxima} jugadores seleccionados
                  </p>
                )}
             </div>
         </div>
      </div>

      <div className="lg:col-span-2 flex justify-end pt-4 border-t border-slate-700">
          <Button type="submit" disabled={loading || !form.horario_id || !selectedUsers.length} texto={loading ? "..." : "Confirmar"} variant="default" size="lg" className="px-8" />
      </div>
    </form>
  );
}