import React from "react";
import {
  FiUsers,
  FiCalendar,
  FiClock,
  FiFlag,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

/* ------------------------------------------
   Tema (acentos inspirados en tu imagen)
------------------------------------------- */
const accent = {
  ring: "ring-amber-400/40",
  glow:
    "shadow-[0_0_0_3px_rgba(251,191,36,0.08),0_10px_30px_-10px_rgba(251,191,36,0.25)]",
  softGlow:
    "shadow-[0_0_0_2px_rgba(251,191,36,0.06),0_8px_20px_-12px_rgba(251,191,36,0.18)]",
  card:
    "bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-800/60 backdrop-blur-xl",
  divider: "divide-white/10",
  border: "border-white/15",
};

/* ------------------------------------------
   Helpers
------------------------------------------- */
const cx = (...c) => c.filter(Boolean).join(" ");
export const getFechaInicioReserva = (fechaStr, horarioStr) => {
  if (!fechaStr || !horarioStr) return new Date();
  const [d, m, y] = String(fechaStr).split("-");
  const hInicio = String(horarioStr).split("-")[0];
  return new Date(`${y}-${m}-${d}T${hInicio}:00`);
};

const estadoCfg = {
  Confirmada: {
    color: "text-emerald-300",
    dot: "bg-emerald-400",
    Icon: FiCheckCircle,
    pill:
      "from-emerald-500/15 to-emerald-400/10 ring-emerald-400/30 shadow-emerald-500/20",
  },
  Reservada: {
    color: "text-amber-300",
    dot: "bg-amber-400",
    Icon: FiClock,
    pill:
      "from-amber-500/15 to-amber-400/10 ring-amber-400/30 shadow-amber-500/20",
  },
  Completada: {
    color: "text-sky-300",
    dot: "bg-sky-400",
    Icon: FiFlag,
    pill:
      "from-sky-500/15 to-sky-400/10 ring-sky-400/30 shadow-sky-500/20",
  },
  Cancelada: {
    color: "text-rose-300",
    dot: "bg-rose-400",
    Icon: FiXCircle,
    pill:
      "from-rose-500/15 to-rose-400/10 ring-rose-400/30 shadow-rose-500/20",
  },
  Default: {
    color: "text-slate-300",
    dot: "bg-slate-400",
    Icon: FiClock,
    pill:
      "from-slate-500/15 to-slate-400/10 ring-slate-400/30 shadow-slate-500/20",
  },
};

function EstadoBadge({ estado }) {
  const { color, dot, Icon, pill } = estadoCfg[estado] || estadoCfg.Default;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        "ring-1",
        color,
        `bg-gradient-to-br ${pill}`
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", dot)} />
      <Icon size={14} aria-hidden />
      {estado}
    </span>
  );
}

/* ------------------------------------------
   Botones
------------------------------------------- */
function GhostButton({ children, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cx(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
        "text-slate-200/90 hover:text-white",
        "ring-1 ring-white/10 hover:ring-white/20",
        "transition"
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, ariaLabel, disabled }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold",
        disabled
          ? "text-slate-900 bg-amber-300/40 cursor-not-allowed"
          : "text-slate-900 bg-amber-300 hover:bg-amber-200 active:bg-amber-300/90",
        "transition",
        accent.glow
      )}
    >
      {children}
    </button>
  );
}

function DangerGhostButton({ children, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cx(
        "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors",
        "text-rose-300 ring-1 ring-rose-400/30 hover:ring-rose-400/40 hover:bg-rose-500/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------
   ReservaCard (reutilizable)
------------------------------------------- */
export default function ReservaCard({
  reserva = {},
  mode = "historial",
  confirmWindowHours = 24,
  onVerJugadores,
  onConfirmarAsistencia,
  onCancelar,
  className,
  rightSlot,
  variant,      // "empleado" para vista de carga de resultados
  selected,     // resalta la card seleccionada
  bottomActions,          // acciones extra en el pie (p.ej. Seleccionar)
  playersCountOverride,   // número de jugadores a mostrar (sobrescribe cantidad)
}) {
  const estado = reserva?.estado || "Reservada";
  const cantidad =
    reserva?.cantidad_usuarios ?? reserva?.cantidad_usuar_ios ?? 1;
  const max = reserva?.max_usuarios ?? 6;
  const shownCantidad = typeof playersCountOverride === 'number' ? playersCountOverride : cantidad;
  const resultado = reserva?.resultado ?? "— — — — — — —";

  // Lógica de "Próxima"
  const ahora = new Date();
  const inicioReserva = getFechaInicioReserva(reserva?.fecha, reserva?.horario);
  const limite = new Date(
    inicioReserva.getTime() - confirmWindowHours * 60 * 60 * 1000
  );
  const usuarioConfirmo = reserva?.asistenciaConfirmada === true;
  const puedeConfirmar = ahora >= limite;

  const hintProxima = usuarioConfirmo
    ? "Asistencia registrada"
    : puedeConfirmar
    ? `Puedes confirmar (${confirmWindowHours} h antes)`
    : `Podrás confirmar ${confirmWindowHours} h antes`;

  return (
    <li
      className={cx(
        "relative rounded-2xl border overflow-hidden",
        accent.card,
        accent.border,
        variant === "empleado" ? "" : accent.softGlow,
        selected ? "border-l-4 border-amber-400/70 bg-white/[0.02]" : "border-l-4 border-white/10",
        className
      )}
    >
      <div className={cx(
        variant === "empleado" ? "p-4" : "p-4 sm:p-5"
      )}>
        {/* Top: título + estado / hint */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Izquierda */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-white font-bold text-base sm:text-lg truncate">
                {reserva?.cancha || "Cancha"}
              </h3>
              {rightSlot}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-300/90">
              <span className="inline-flex items-center gap-1.5">
                <FiCalendar aria-hidden />
                <span className="tabular-nums">{reserva?.fecha || "--/--/----"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiClock aria-hidden />
                <span className="tabular-nums">{reserva?.horario || "--:--"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiUsers aria-hidden /> {shownCantidad} / {max}
              </span>
              {mode === "historial" && (
                <span className="inline-flex items-center gap-1.5">
                  <FiFlag aria-hidden />
                  <span className="font-mono text-slate-200">{resultado}</span>
                </span>
              )}
            </div>
          </div>

          {/* Derecha: estado / hint */}
          {mode === "historial" ? (
            <EstadoBadge estado={estado} />
          ) : (
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                usuarioConfirmo
                  ? "text-emerald-300 ring-emerald-400/30"
                  : puedeConfirmar
                  ? "text-amber-300 ring-amber-400/30"
                  : "text-slate-300 ring-white/10"
              )}
            >
              {(usuarioConfirmo ? <FiCheckCircle size={14} /> : <FiClock size={14} />)}
              {hintProxima}
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {onVerJugadores && (
              <GhostButton
                onClick={() => onVerJugadores(reserva)}
                ariaLabel="Ver jugadores"
              >
                <FiUsers size={16} /> Ver jugadores
              </GhostButton>
            )}

            {mode === "historial" ? (
              !reserva?.asistenciaConfirmada && onConfirmarAsistencia && (
                <PrimaryButton
                  onClick={() => onConfirmarAsistencia(reserva)}
                  ariaLabel="Confirmar asistencia"
                >
                  <FiCheckCircle size={16} /> Confirmar asistencia
                </PrimaryButton>
              )
            ) : (
              <>
                {!usuarioConfirmo && onConfirmarAsistencia ? (
                  <PrimaryButton
                    onClick={() => onConfirmarAsistencia(reserva?._id || reserva)}
                    ariaLabel="Confirmar asistencia"
                    disabled={!puedeConfirmar}
                  >
                    <FiCheckCircle size={16} /> Confirmar asistencia
                  </PrimaryButton>
                ) : (
                  <span
                    className={cx(
                      "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold",
                      "text-slate-400 ring-1 ring-white/10 cursor-not-allowed"
                    )}
                  >
                    <FiCheckCircle size={16} /> Asistencia confirmada
                  </span>
                )}

                {onCancelar && (
                  <DangerGhostButton
                    onClick={() => onCancelar(reserva?._id || reserva)}
                    ariaLabel="Cancelar reserva"
                  >
                    <FiXCircle size={16} /> Cancelar reserva
                  </DangerGhostButton>
                )}
              </>
            )}
          </div>
          {bottomActions && <div className="ml-auto">{bottomActions}</div>}
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------
   EmptyState opcional
------------------------------------------- */
export function EmptyState({ onPrimary }) {
  return (
    <div
      className={cx(
        "rounded-2xl p-10 text-center border",
        accent.card,
        accent.border,
        accent.softGlow
      )}
    >
      <div
        className={cx(
          "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl ring-1",
          "bg-gradient-to-br from-amber-500/10 to-amber-400/5",
          accent.ring
        )}
      >
        <FiUsers className="text-amber-300" size={22} />
      </div>
      <h3 className="text-white font-extrabold tracking-tight text-lg">
        Sin reservas
      </h3>
      <p className="text-slate-400/90 text-sm mt-1">
        Cuando tengas reservas, aparecerán aquí.
      </p>

      {onPrimary && (
        <button
          onClick={onPrimary}
          className={cx(
            "mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
            "text-slate-900 bg-amber-300 hover:bg-amber-200 active:bg-amber-300/90",
            "transition shadow-md hover:shadow-lg"
          )}
        >
          <FiCheckCircle size={16} /> Nueva reserva
        </button>
      )}
    </div>
  );
}
