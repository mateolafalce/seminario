import { useMemo } from "react";
import { motion } from "framer-motion";
import homeHeroPadel from "../../../assets/images/homeHeroPadel.jpg";
import { getFileUrl } from "../../../app/config";
import { FiMapPin, FiClock } from "react-icons/fi";

export default function CourtCard({
  cancha,
  horarios = [],
  cantidades = {},
  isAuthenticated = false,
  selected = null,
  onOpenDetail,
  onViewCancha,
  isPastSlot,
  capacity,
}) {
  // CONFIGURACIÓN DE COLORES
  const THEME = {
    cardBg: "bg-[#0F1524]", 
    cardBorder: "border border-white/10",
    activeBtn: "bg-amber-400 text-slate-900 font-bold shadow-lg shadow-amber-400/20 transform scale-105",
    defaultBtn: "bg-slate-800/40 text-slate-300 border border-slate-700 hover:border-amber-400/50 hover:bg-slate-700 hover:text-white transition-all",
    disabledBtn: "bg-slate-900/30 text-slate-600 border border-slate-800/50 cursor-not-allowed",
  };

  const nombre = cancha.nombre || "Cancha";
  const imagen = getFileUrl(cancha.imagen_url) || homeHeroPadel;
  const key = nombre;

  const horariosProcesados = useMemo(() => {
    let capRaw = capacity ?? cancha?.capacidad_maxima ?? 6;
    let capNum = parseInt(capRaw, 10);
    if (!Number.isFinite(capNum) || capNum <= 0) capNum = 6;
    if (capNum > 50) capNum = 50;

    return horarios.map((h) => {
      const k = `${key}-${h}`;
      const cantidad = cantidades[k] || 0;
      const lleno = cantidad >= capNum;
      return { hora: h, cantidad, lleno, restantes: Math.max(0, capNum - cantidad) };
    });
  }, [horarios, cantidades, key, capacity, cancha]);

  const handleCardClick = (e) => {
    // Solo abrimos detalle si el click NO viene de un botón de horario
    if (e.target.closest('.horario-btn')) return;
    if (onViewCancha) {
      onViewCancha(cancha);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      onClick={handleCardClick}
      className={`flex flex-col md:flex-row w-full rounded-2xl overflow-hidden shadow-xl ${THEME.cardBg} ${THEME.cardBorder} hover:border-amber-400/30 transition-colors group mb-6 cursor-pointer`}
    >
      {/* --- SECCIÓN IMAGEN --- */}
      <div className="relative w-full h-48 md:h-auto md:w-[40%] bg-[#0F1524] shrink-0 overflow-hidden">
         <img
            src={imagen}
            alt={nombre}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
         />

         {/* Degradado sutil en móvil (solo sobre el título) */}
         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 md:hidden">
            <h3 className="text-xl font-bold text-white drop-shadow-lg leading-none">{nombre}</h3>
         </div>

         {/* Degradado sutil en PC (derecha) */}
         <div 
            className="hidden md:block absolute top-0 bottom-0 right-0 w-24 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent 0%, rgba(15, 21, 36, 0.6) 100%)' }}
         />
      </div>

      {/* --- SECCIÓN DATOS --- */}
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center relative z-10">
          
          {/* Header (Solo PC) */}
          <div className="hidden md:flex justify-between items-start mb-5">
              <div>
                  <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <FiMapPin /> Club Central
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight">{nombre}</h3>
              </div>
          </div>

          {/* Grid de Horarios */}
          <div className="w-full">
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                 <FiClock className="text-amber-400"/> Selecciona un horario:
              </div>

              {horariosProcesados.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                      Sin turnos disponibles
                  </div>
              ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {horariosProcesados.map(({ hora, lleno, restantes }) => {
                          const selectedHere = selected?.cancha === key && selected?.hora === hora;
                          const pasado = isPastSlot?.(hora);

                          return (
                              <button
                                  key={hora}
                                  disabled={!isAuthenticated || lleno || pasado}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenDetail?.(key, hora);
                                  }}
                                  className={`
                                      horario-btn relative flex flex-col items-center justify-center py-2.5 rounded-lg text-xs transition-all border
                                      ${lleno || pasado ? 'border-transparent opacity-50 ' + THEME.disabledBtn : 
                                        selectedHere ? 'border-amber-400 ' + THEME.activeBtn : 
                                        THEME.defaultBtn}
                                  `}
                              >
                                  <span className="font-semibold">{hora}</span>
                                  {!lleno && !pasado && (
                                      <span className={`text-[10px] mt-0.5 ${selectedHere ? 'text-slate-900' : 'text-slate-500'}`}>
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
      </div>
    </motion.div>
  );
}