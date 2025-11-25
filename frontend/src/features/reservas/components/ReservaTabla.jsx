import { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../auth/context/AuthContext";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";
import MessageConfirm from "../../../shared/components/ui/Confirm/MessageConfirm";
import backendClient from "../../../shared/services/backendClient";
import CourtCard from "./CourtCard"; // Usamos la tarjeta bonita
import { FiCalendar, FiFilter } from "react-icons/fi";
import { isCanchaDisponibleEnFecha } from "../../../shared/utils/disponibilidadCancha";

const formatDate = (date) => {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

const normalizarTexto = (t) => t.trim().replace(/\s+/g, " ");

export default function ReservaTabla() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Estados
  const [mensaje, setMensaje] = useState("");
  const [reservaPendiente, setReservaPendiente] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selected, setSelected] = useState(null);
  
  // Datos
  const [canchasRaw, setCanchasRaw] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [horariosById, setHorariosById] = useState({});
  const [horariosPorCancha, setHorariosPorCancha] = useState({});
  const [cantidades, setCantidades] = useState({});
  
  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [detalleReserva, setDetalleReserva] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // --- Carga de Datos ---
  useEffect(() => {
    let alive = true;
    const fetchData = async () => {
        try {
            const [hData, cData] = await Promise.all([
                backendClient.get("horarios/listar"),
                backendClient.get("canchas/listar")
            ]);
            if (!alive) return;

            const hArr = Array.isArray(hData) ? hData : [];
            const byId = {};
            const horas = [];
            hArr.forEach(h => {
                if(h.hora && h.id) { byId[h.id] = h.hora; if(!horas.includes(h.hora)) horas.push(h.hora); }
            });
            setHorarios(horas);
            setHorariosById(byId);

            const cArr = Array.isArray(cData) ? cData : [];
            setCanchasRaw(cArr);
        } catch (e) { console.error(e); }
    };
    fetchData();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const map = {};
    canchasRaw.forEach((c) => {
      const ids = Array.isArray(c.horarios) ? c.horarios : [];
      map[c.nombre] = ids.map((id) => horariosById[id]).filter(Boolean);
    });
    setHorariosPorCancha(map);
  }, [canchasRaw, horariosById]);

  useEffect(() => {
    let alive = true;
    const fetchCantidades = async () => {
        try {
            const data = await backendClient.get("reservas/cantidad", { fecha: selectedDate });
            if (!alive) return;
            const mapa = {};
            (data || []).forEach((it) => { mapa[`${it.cancha}-${it.horario}`] = it.cantidad; });
            setCantidades(mapa);
        } catch { if(alive) setCantidades({}); }
    };
    fetchCantidades();
    return () => { alive = false; };
  }, [selectedDate]);

  // UX: Ordenar canchas (Las que tienen ID más bajo o alfabético primero)
  const canchasOrdenadas = useMemo(() => {
     return [...canchasRaw].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [canchasRaw]);

  // Lógica Negocio
  const isPastSlot = (hora) => {
    const todayStr = formatDate(new Date());
    if (selectedDate !== todayStr) return false;
    const [h, m] = hora.split("-")[0].split(":").map(Number);
    const slotTime = new Date(); slotTime.setHours(h, m, 0, 0);
    return slotTime.getTime() - Date.now() < 3600000;
  };

  const abrirDetalle = async (cancha, hora) => { 
    setLoadingDetalle(true); setModalOpen(true);
    try {
        const data = await backendClient.get("reservas/detalle", {
            cancha: normalizarTexto(cancha), horario: normalizarTexto(hora), fecha: selectedDate,
            ...(user?.id ? { usuario_id: user.id } : {})
        });
        setDetalleReserva(data);
    } catch { setDetalleReserva(null); } finally { setLoadingDetalle(false); }
  };
  
  const handleConfirmar = async () => { 
      if (!reservaPendiente) return;
      const { cancha, hora } = reservaPendiente;
      try {
          await backendClient.post("reservas/reservar", { cancha, horario: hora, fecha: selectedDate });
          toast(<MiToast mensaje="Reserva confirmada" color="var(--color-green-400)" />);
          const res = await backendClient.get("reservas/cantidad", { fecha: selectedDate });
          const mapa = {}; (res || []).forEach((it) => { mapa[`${it.cancha}-${it.horario}`] = it.cantidad; });
          setCantidades(mapa);
          setSelected({ cancha, hora });
      } catch (e) { toast(<MiToast mensaje={e.message} color="var(--color-red-400)" />); } 
      finally { setReservaPendiente(null); setMensaje(""); }
  };

  const reservar = (cancha, hora) => {
    setReservaPendiente({ cancha, hora });
    setMensaje(`¿Confirmar reserva en "${cancha}" a las ${hora}?`);
  };

  const cancelar = async (reservaId) => { /* Tu lógica de cancelar */ };
  const handleViewCancha = (cancha) => {
      const id = cancha.id || cancha._id;
      if(id) navigate(`/canchas/${id}`, { state: { cancha } });
  };

  // Filter canchas based on selected date
  const canchasVisibles = canchasOrdenadas.filter((c) =>
    isCanchaDisponibleEnFecha(c, selectedDate)
  );

  return (
    <div className="min-h-[85vh] w-full pt-12 pb-20 px-4 bg-[#0B101B]">
      <div className="mx-auto max-w-7xl">
        
        {/* HEADER LIMPIO */}
        <div className="flex flex-col items-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
                Reservar Turno
            </h1>
            
            {/* Input de Fecha Grande */}
            <div className="relative group w-full max-w-md">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none">
                    <FiCalendar size={22} />
                </div>
                <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { if(e.target.value) setSelectedDate(e.target.value); setSelected(null); }}
                    min={formatDate(new Date())}
                    className="
                        bg-[#151B2B] border border-white/10 text-white text-xl font-bold text-center
                        pl-12 pr-6 py-5 rounded-2xl shadow-2xl cursor-pointer outline-none w-full
                        focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all
                        hover:bg-[#1A2133]
                        [color-scheme:dark]
                    "
                />
            </div>
        </div>

        {/* FEED DE CANCHAS */}
        <div className="mb-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                 <FiFilter className="text-amber-400"/>
                 <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Disponibilidad</span>
            </div>
            <span className="text-slate-500 text-xs">{canchasRaw.length} canchas encontradas</span>
        </div>

        {canchasVisibles.length === 0 ? (
          <div className="mt-10 text-center text-slate-400 text-sm">
            No hay canchas disponibles para esta fecha.
            <br />
            Probá cambiar el día o el horario.
          </div>
        ) : (
          // GRID RESPONSIVE: 1 col en celular, 2 cols en PC
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
              {canchasVisibles.map((cancha) => (
                  <CourtCard
                      key={cancha.id || cancha.nombre}
                      cancha={cancha}
                      horarios={horariosPorCancha[cancha.nombre] || []}
                      cantidades={cantidades}
                      isAuthenticated={!!user}
                      selected={selected}
                      onOpenDetail={abrirDetalle}
                      onViewCancha={handleViewCancha}
                      isPastSlot={isPastSlot}
                  />
              ))}
          </div>
        )}

        {/* MODALES IGUAL QUE SIEMPRE */}
        {modalOpen && detalleReserva && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
                <div className="w-full max-w-md bg-[#0F1524] border border-white/10 p-6 rounded-2xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    <button className="absolute top-3 right-3 text-slate-400 hover:text-white" onClick={() => setModalOpen(false)}>✕</button>
                    <h3 className="text-xl font-bold text-white text-center mb-6">
                        {detalleReserva.cancha} <span className="text-amber-400">|</span> {detalleReserva.horario}
                    </h3>
                    <div className="bg-slate-900/50 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto custom-scrollbar border border-white/5">
                       {/* ... contenido jugadores ... */}
                       {detalleReserva.usuarios.length === 0 ? <p className="text-slate-400 text-sm italic">Sin jugadores.</p> : 
                            detalleReserva.usuarios.map((u,i) => <div key={i} className="text-slate-300 text-sm">• {u.nombre}</div>)
                       }
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { setModalOpen(false); reservar(detalleReserva.cancha, detalleReserva.horario); }} className="w-full py-3 rounded-lg bg-amber-400 text-slate-900 font-bold hover:bg-amber-300">Reservar</button>
                    </div>
                </div>
             </div>
        )}
        <MessageConfirm mensaje={mensaje} onClose={() => setMensaje("")} onConfirm={handleConfirmar} onCancel={() => setMensaje("")} />
      </div>
    </div>
  );
}