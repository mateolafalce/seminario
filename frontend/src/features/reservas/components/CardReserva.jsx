import {
  FiUsers, FiCalendar, FiClock, FiFlag, FiCheckCircle, FiXCircle,
} from "react-icons/fi";

// Estilos base unificados con el tema Admin
const accent = {
  card: "bg-slate-900/60 border border-slate-700/60 backdrop-blur-sm",
  cardSelected: "bg-slate-800/80 border-yellow-400/50 ring-1 ring-yellow-400/20",
  textMuted: "text-slate-400",
  textLight: "text-slate-200",
};

// Badges de estado modernos
const EstadoBadge = ({ estado }) => {
  const styles = {
    Confirmada: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Reservada: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Completada: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Cancelada: "bg-red-500/10 text-red-400 border-red-500/20",
    Default: "bg-slate-700 text-slate-300 border-slate-600",
  };
  const style = styles[estado] || styles.Default;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {estado}
    </span>
  );
};

export default function ReservaCard({
  reserva = {},
  mode = "historial", // "historial" | "proxima"
  confirmWindowHours = 24,
  onVerJugadores,
  onConfirmarAsistencia,
  onCancelar,
  className = "",
  rightSlot,
  variant,      // "empleado" (más compacto)
  selected,     // booleano para resaltar
  bottomActions,
  playersCountOverride,
  onClick, // para hacer click en toda la card
}) {
  const estado = reserva?.estado || "Reservada";
  const cantidad = reserva?.cantidad_usuarios ?? 1;
  const max = reserva?.max_usuarios ?? 6;
  const shownCantidad = typeof playersCountOverride === 'number' ? playersCountOverride : cantidad;
  const resultado = reserva?.resultado;

  // 👉 nuevo: sólo mostramos "Ver jugadores" si hay más de 1
  const hayOtrosJugadores = shownCantidad > 1;

  // Lógica de "Próxima"
  const ahora = new Date();
  const [d, m, y] = (reserva?.fecha || "--/--/----").split("-");
  const [h] = (reserva?.horario || "00:00").split(":");
  const inicioReserva = new Date(`${y}-${m}-${d}T${h}:00`); // Aproximado
  const limite = new Date(inicioReserva.getTime() - confirmWindowHours * 3600000);
  const usuarioConfirmo = reserva?.asistenciaConfirmada === true;
  const puedeConfirmar = ahora >= limite;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl overflow-hidden transition-all duration-200
        ${selected ? accent.cardSelected : accent.card}
        ${onClick ? "cursor-pointer hover:border-slate-600" : ""}
        ${className}
      `}
    >
      <div className={`p-4 ${variant === "empleado" ? "py-3" : "sm:p-5"}`}>
        
        {/* Header: Cancha y Estado */}
        <div className="flex justify-between items-start gap-4 mb-3">
          <div>
            <h3 className="text-white font-bold text-base truncate pr-2">
              {reserva?.cancha || "Cancha"}
            </h3>
            {/* Info Line */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                    <FiCalendar /> {reserva?.fecha}
                </span>
                <span className="flex items-center gap-1.5">
                    <FiClock /> {reserva?.horario}
                </span>
                <span className="flex items-center gap-1.5">
                    <FiUsers /> {shownCantidad}/{max}
                </span>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-2">
             {rightSlot || (mode === "historial" ? (
                <EstadoBadge estado={estado} />
             ) : (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${usuarioConfirmo ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    {usuarioConfirmo ? "Confirmado" : "Pendiente"}
                </span>
             ))}
          </div>
        </div>

        {/* Resultado (si existe) */}
        {resultado && (
            <div className="mt-2 p-2 bg-slate-950/50 rounded border border-slate-800 flex items-center gap-2">
                <FiFlag className="text-yellow-400 text-xs" />
                <span className="text-xs font-mono text-slate-300">{resultado}</span>
            </div>
        )}

        {/* Acciones (Botones) */}
        <div className="mt-4 flex flex-wrap gap-2 items-center justify-end">
            
            {onVerJugadores && hayOtrosJugadores && (
              <button 
                onClick={(e) => { e.stopPropagation(); onVerJugadores(reserva); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Ver Jugadores
              </button>
            )}

            {mode === "proxima" && (
                <>
                    {!usuarioConfirmo && onConfirmarAsistencia && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onConfirmarAsistencia(reserva._id); }}
                            disabled={!puedeConfirmar}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1
                                ${!puedeConfirmar ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-yellow-400 text-slate-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/10'}
                            `}
                        >
                            <FiCheckCircle /> Confirmar
                        </button>
                    )}
                    {onCancelar && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCancelar(reserva._id); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                        >
                            <FiXCircle /> Cancelar
                        </button>
                    )}
                </>
            )}

            {bottomActions}
        </div>

      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
        <FiCalendar size={24} className="mb-2 opacity-50"/>
        <p className="text-sm">No tienes reservas en esta lista.</p>
    </div>
  );
}
