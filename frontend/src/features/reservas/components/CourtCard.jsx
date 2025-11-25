import { useMemo } from "react";
import { motion } from "framer-motion";
import homeHeroPadel from "../../../assets/images/homeHeroPadel.jpg";
import { getFileUrl } from "../../../app/config";
import { FiMapPin, FiInfo, FiClock } from "react-icons/fi";

export default function CourtCard({
  cancha,
  horarios = [],
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
    activeBtn: "bg-amber-400 text-slate-900 font-bold shadow-lg shadow-amber-400/20 transform scale-105",
    defaultBtn: "bg-slate-800/40 text-slate-300 border border-slate-700 hover:border-amber-400/50 hover:bg-slate-700 hover:text-white transition-all",
    disabledBtn: "bg-slate-900/30 text-slate-600 border border-slate-800/50 cursor-not-allowed",
  };

  const nombre = cancha.nombre || "Cancha";
  const imagen = getFileUrl(cancha.imagen_url) || homeHeroPadel;
  const key = nombre;

  const horariosProcesados = useMemo(() => {
    return horarios.map(h => {
        const k = `${key}-${h}`;
        const cantidad = cantidades[k] || 0;
        const lleno = cantidad >= capacity;
        return { hora: h, cantidad, lleno, restantes: Math.max(0, capacity - cantidad) };
    });
  }, [horarios, cantidades, key, capacity]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      // IMPORTANTE: bg-[#0F1524] asegura que si algo falla, el fondo sea del mismo color que la tarjeta
      className={`flex flex-col md:flex-row w-full rounded-2xl overflow-hidden shadow-2xl ${THEME.cardBg} ${THEME.cardBorder} hover:border-amber-400/30 transition-colors group mb-6`}
      style={{ minHeight: '260px' }}
    >
      {/* SECCIÓN IMAGEN */}
      {/* Usamos el mismo color de fondo que la tarjeta para evitar líneas de corte */}
      <div className="relative w-full md:w-[40%] h-48 md:h-auto bg-[#0F1524] shrink-0">
         
         <img
            src={imagen}
            alt={nombre}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            // 🌟 LA SOLUCIÓN NUCLEAR: MÁSCARA CSS
            // Esto le dice al navegador: "Haz transparente la imagen gradualmente".
            // - webkitMaskImage: Para Chrome/Safari/Edge
            // - maskImage: Estándar
            style={{
                maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)'
            }}
         />

         {/* Parche solo para móviles (El degradado vertical) */}
         {/* En PC (md:hidden) se oculta para que mande la máscara de arriba */}
         <div className="absolute inset-0 bg-gradient-to-t from-[#0F1524] via-transparent to-transparent md:hidden" />

         {/* Título en Móvil */}
         <div className="absolute bottom-3 left-4 md:hidden z-10">
            <h3 className="text-xl font-bold text-white drop-shadow-md">{nombre}</h3>
         </div>
      </div>

      {/* SECCIÓN DATOS */}
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
          
          <div className="hidden md:flex justify-between items-start mb-5">
              <div>
                  <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <FiMapPin /> Club Central
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight">{nombre}</h3>
              </div>
              
              {onViewCancha && (
                  <button onClick={() => onViewCancha(cancha)} className="text-slate-500 hover:text-white transition-colors">
                      <FiInfo size={20}/>
                  </button>
              )}
          </div>

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
                                  onClick={() => onOpenDetail?.(key, hora)}
                                  className={`
                                      relative flex flex-col items-center justify-center py-2.5 rounded-lg text-xs transition-all border
                                      ${lleno || pasado ? 'border-transparent opacity-60 ' + THEME.disabledBtn : 
                                        selectedHere ? 'border-amber-400 ' + THEME.activeBtn : 
                                        THEME.defaultBtn}
                                  `}
                              >
                                  <span className="font-semibold text-sm">{hora}</span>
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