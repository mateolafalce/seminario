import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Carousel de canchas con horarios
 * Props:
 * - canchas: string[]               ← nombres de canchas
 * - horarios: string[]              ← array de "HH:mm-HH:mm"
 * - cantidades: Record<string,number>  ← clave `${cancha}-${hora}` -> reservados
 * - isAuthenticated: boolean
 * - selected?: { cancha: string, hora: string } | null
 * - onOpenDetail: (cancha: string, hora: string) => void
 * - isPastSlot: (hora: string) => boolean
 * - capacity?: number (default 6)
 */
export default function CourtCarousel({
  canchas = [],
  horarios = [],
  cantidades = {},
  isAuthenticated = false,
  selected = null,
  onOpenDetail,
  isPastSlot,
  capacity = 6,
}) {
  const GOLD = {
    ring: 'focus:ring-amber-400/70 focus-visible:ring-2 focus-visible:ring-amber-400/70',
    card: 'bg-white/5 backdrop-blur-sm border border-white/10',
    chip: 'bg-white/5 hover:bg-white/10 border border-white/10',
    shadow: 'shadow-[0_10px_25px_-10px_rgba(0,0,0,0.6)]',
    accent: 'text-amber-400',
  };

  // --- Carousel state ---
  const [[page, direction], setPage] = useState([0, 0]);
  const index = useMemo(() => {
    const len = canchas.length || 1;
    const i = page % len;
    return (i + len) % len;
  }, [page, canchas.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') setPage(([p]) => [p + 1, 1]);
      if (e.key === 'ArrowLeft') setPage(([p]) => [p - 1, -1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const paginate = (dir) => setPage(([p]) => [p + dir, dir]);

  // --- Animaciones ---
  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 120 : -120, opacity: 0, scale: 0.98 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir) => ({ x: dir < 0 ? 120 : -120, opacity: 0, scale: 0.98 }),
  };
  const swipeThreshold = 100;

  // --- Helpers ---
  const canchaActual = canchas[index];

  const disponibilidad = (cancha, hora) => {
    const key = `${cancha}-${hora}`;
    const cantidad = cantidades[key] || 0;
    const lleno = cantidad >= capacity;
    const restantes = Math.max(0, capacity - cantidad);
    return { cantidad, lleno, restantes };
  };

  const ocupacionPct = useMemo(() => {
    if (!canchaActual) return 0;
    const ocupados = horarios.reduce((acc, h) => acc + (cantidades[`${canchaActual}-${h}`] || 0), 0);
    const total = horarios.length * capacity;
    return total ? Math.round((ocupados / total) * 100) : 0;
  }, [cantidades, canchaActual, horarios, capacity]);

  return (
    <div className="relative mt-8">
      {/* Flechas */}
      <button
        className={`absolute -left-2 md:-left-8 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full border ${GOLD.chip} ${GOLD.ring}`}
        onClick={() => paginate(-1)}
        aria-label="Anterior cancha"
      >
        ←
      </button>
      <button
        className={`absolute -right-2 md:-right-8 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full border ${GOLD.chip} ${GOLD.ring}`}
        onClick={() => paginate(1)}
        aria-label="Siguiente cancha"
      >
        →
      </button>

      {/* Slide */}
      <div className="overflow-hidden">
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={`${index}-${canchaActual || 'empty'}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
            className="mx-auto max-w-3xl"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, info) => {
              if (info.offset.x > swipeThreshold) paginate(-1);
              else if (info.offset.x < -swipeThreshold) paginate(1);
            }}
          >
            {/* Tarjeta */}
            {!canchas.length ? (
              <div className={`text-center rounded-2xl p-10 ${GOLD.card}`}>
                <p className="text-slate-300">No hay canchas para mostrar.</p>
              </div>
            ) : (
              <div className={`rounded-2xl p-6 md:p-7 ${GOLD.card} ${GOLD.shadow}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={`text-xl font-semibold tracking-tight ${GOLD.accent}`}>
                      {canchaActual}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {horarios.length} horarios disponibles
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Ocupación</div>
                    <div className="text-base font-bold text-white">{ocupacionPct}%</div>
                  </div>
                </div>

                {/* Barra ocupación */}
                <div className="mt-3 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${ocupacionPct}%` }} />
                </div>

                {/* Horarios */}
                <div className="mt-5">
                  <div className="flex flex-wrap gap-2">
                    {horarios.map((hora) => {
                      const { cantidad, lleno, restantes } = disponibilidad(canchaActual, hora);
                      const selectedHere = selected?.cancha === canchaActual && selected?.hora === hora;
                      const pasado = isPastSlot?.(hora);
                      const almostFull = !lleno && !pasado && restantes <= 2;

                      const base =
                        'px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border ' +
                        'inline-flex flex-col items-center justify-center min-w-[4.8rem]';
                      const stateCls = lleno
                        ? 'cursor-not-allowed bg-white/5 text-rose-300 border-rose-500/40'
                        : pasado
                        ? 'cursor-not-allowed bg-white/5 text-neutral-400 border-neutral-500/40'
                        : selectedHere
                        ? 'bg-amber-400 text-[#0B1220] border-amber-400 shadow'
                        : almostFull
                        ? 'bg-amber-400/10 text-amber-200 border-amber-400/60 hover:bg-amber-400/20'
                        : `${GOLD.chip} text-slate-100 hover:bg-white/10`;

                      const subtitle = lleno ? 'Lleno' : pasado ? 'Pasado' : `${cantidad}/${capacity}`;

                      return (
                        <button
                          key={hora}
                          className={`${base} ${stateCls} ${GOLD.ring}`}
                          disabled={!isAuthenticated || lleno || pasado}
                          onClick={() => onOpenDetail?.(canchaActual, hora)}
                          title={lleno ? 'No hay cupos' : `Quedan ${restantes} cupos`}
                          aria-label={`Horario ${hora} ${subtitle}`}
                        >
                          <span>{hora}</span>
                          <span className="text-[11px] leading-none opacity-80">{subtitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pie: indicador y hint */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-xs text-slate-400">Usa ← → o arrastra para cambiar de cancha</div>
                  <div className="flex items-center gap-1.5">
                    {canchas.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(([p]) => [p + (i - index), i > index ? 1 : -1])}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          i === index ? 'bg-amber-400 scale-100' : 'bg-white/20 scale-90 hover:bg-white/30'
                        }`}
                        aria-label={`Ir a cancha ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
