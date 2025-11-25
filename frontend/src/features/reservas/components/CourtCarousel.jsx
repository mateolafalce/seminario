import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import homeHeroPadel from "../../../assets/images/homeHeroPadel.jpg";
import { getFileUrl } from "../../../app/config";
import { FiChevronLeft, FiChevronRight, FiMapPin, FiInfo, FiClock, FiCalendar } from "react-icons/fi";

export default function CourtCarousel({
  canchas = [],
  horarios = [],
  horariosByCancha = {},
  cantidades = {},
  isAuthenticated = false,
  selected = null,
  onOpenDetail,
  onViewCancha,
  isPastSlot,
  capacity = 6,
}) {
  const THEME = {
    cardBg: "bg-[#0F1524]",
    cardBorder: "border border-white/10",
    accent: "text-amber-400",
    activeBtn: "bg-amber-400 text-slate-900 font-bold shadow-lg shadow-amber-400/20",
    defaultBtn: "bg-slate-800/40 text-slate-300 border border-slate-700 hover:border-amber-400/50 hover:bg-slate-700 hover:text-white transition-all",
    disabledBtn: "bg-slate-900/30 text-slate-600 border border-slate-800/50 cursor-not-allowed",
  };

  const [[page, direction], setPage] = useState([0, 0]);
  const index = useMemo(() => {
    const len = canchas.length || 1;
    const i = page % len;
    return (i + len) % len;
  }, [page, canchas.length]);

  const paginate = (dir) => setPage(([p]) => [p + dir, dir]);

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir < 0 ? 50 : -50, opacity: 0 }),
  };

  const canchaRaw = canchas[index];
  const canchaNombre = typeof canchaRaw === "string" ? canchaRaw : canchaRaw?.nombre || "";
  const canchaImagen = canchaRaw && typeof canchaRaw === "object"
      ? getFileUrl(canchaRaw.imagen_url || canchaRaw.imagenUrl || "") || homeHeroPadel
      : homeHeroPadel;
  const canchaKey = canchaNombre || String(canchaRaw || "");

  const horariosVisibles = useMemo(() => {
    if (horariosByCancha && canchaNombre && Array.isArray(horariosByCancha[canchaNombre]) && horariosByCancha[canchaNombre].length > 0) {
      return horariosByCancha[canchaNombre];
    }
    return horarios;
  }, [horariosByCancha, canchaNombre, horarios]);

  const disponibilidad = (cancha, hora) => {
    const key = `${cancha}-${hora}`;
    const cantidad = cantidades[key] || 0;
    const lleno = cantidad >= capacity;
    const restantes = Math.max(0, capacity - cantidad);
    return { cantidad, lleno, restantes };
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-6 px-4">
      {/* Navegación Lateral */}
      <button onClick={() => paginate(-1)} className="absolute left-0 md:-left-8 top-1/2 -translate-y-1/2 z-20 p-3 text-slate-500 hover:text-amber-400 transition-all">
        <FiChevronLeft size={32} />
      </button>
      <button onClick={() => paginate(1)} className="absolute right-0 md:-right-8 top-1/2 -translate-y-1/2 z-20 p-3 text-slate-500 hover:text-amber-400 transition-all">
        <FiChevronRight size={32} />
      </button>

      <div className="overflow-hidden py-2">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={`${index}-${canchaKey}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`flex flex-col md:flex-row w-full rounded-2xl overflow-hidden shadow-2xl ${THEME.cardBg} ${THEME.cardBorder}`}
            style={{ minHeight: '400px' }}
          >
            {/* Imagen Izquierda */}
            <div className="relative w-full md:w-5/12 h-56 md:h-auto bg-slate-900">
               <img src={canchaImagen} alt={canchaNombre} className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0F1524] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0F1524]" />
            </div>

            {/* Panel Derecha */}
            <div className="flex-1 p-6 md:p-8 flex flex-col">
                <div className="hidden md:block mb-4">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">
                        <FiMapPin /> Cancha {index + 1}
                    </div>
                    <h2 className="text-3xl font-bold text-white">{canchaNombre || "Cancha Principal"}</h2>
                    {onViewCancha && (
                        <button onClick={() => onViewCancha(canchaRaw)} className="mt-1 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                            <FiInfo /> Ver info detallada
                        </button>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-400 border-b border-white/5 pb-2">
                         <FiClock className="text-amber-400"/> Horarios disponibles
                    </div>

                    {horariosVisibles.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                            Sin horarios
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                            {horariosVisibles.map((hora) => {
                                const { lleno, restantes } = disponibilidad(canchaKey, hora);
                                const selectedHere = selected?.cancha === canchaKey && selected?.hora === hora;
                                const pasado = isPastSlot?.(hora);

                                return (
                                    <button
                                        key={hora}
                                        disabled={!isAuthenticated || lleno || pasado}
                                        onClick={() => onOpenDetail?.(canchaKey, hora)}
                                        className={`
                                            relative flex flex-col items-center justify-center py-2.5 rounded-lg text-sm group transition-all duration-200 border
                                            ${lleno || pasado ? 'border-transparent ' + THEME.disabledBtn : selectedHere ? 'border-amber-400 ' + THEME.activeBtn : THEME.defaultBtn}
                                        `}
                                    >
                                        <span className="font-semibold tracking-tight">{hora}</span>
                                        {!lleno && !pasado && (
                                            <span className={`text-[10px] mt-0.5 ${selectedHere ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                               {restantes} libres
                                            </span>
                                        )}
                                        {lleno && <span className="text-[9px] text-rose-500 font-bold mt-0.5">FULL</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Paginador Puntos */}
                <div className="mt-4 flex justify-center gap-2">
                     {canchas.map((_, i) => (
                        <button key={i} onClick={() => setPage(([p]) => [p + (i - index), i > index ? 1 : -1])} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-amber-400" : "w-1.5 bg-slate-700"}`} />
                     ))}
                </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}