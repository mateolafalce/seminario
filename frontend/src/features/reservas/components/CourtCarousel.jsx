// src/features/reservas/components/CourtCarousel.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import homeHeroPadel from "../../../assets/images/homeHeroPadel.jpg";

/** Carousel de canchas con horarios
 * Props:
 * - canchas: (string | { nombre: string; descripcion?: string; imagen_url?: string })[]
 * - horarios: string[]              ← array de "HH:MM-HH:MM"
 * - horariosByCancha?: { [nombreCancha: string]: string[] }  ← opcional
 * - cantidades: Record<string,number>  ← clave `${cancha}-${hora}` -> reservados
 * - isAuthenticated: boolean
 * - selected?: { cancha: string, hora: string } | null
 * - onOpenDetail: (cancha: string, hora: string) => void
 * - onViewCancha?: (cancha: string | object) => void
 * - isPastSlot: (hora: string) => boolean
 * - capacity?: number (default 6)
 */
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
  const GOLD = {
    ring: "focus:ring-amber-400/70 focus-visible:ring-2 focus-visible:ring-amber-400/70",
    card: "bg-white/5 backdrop-blur-sm border border-white/10",
    chip: "bg-white/5 hover:bg-white/10 border border-white/10",
    shadow: "shadow-[0_10px_25px_-10px_rgba(0,0,0,0.6)]",
    accent: "text-amber-400",
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
      if (e.key === "ArrowRight") setPage(([p]) => [p + 1, 1]);
      if (e.key === "ArrowLeft") setPage(([p]) => [p - 1, -1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const paginate = (dir) => setPage(([p]) => [p + dir, dir]);

  // --- Animaciones ---
  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 120 : -120, opacity: 0, scale: 0.98 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir) => ({ x: dir < 0 ? 120 : -120, opacity: 0, scale: 0.98 }),
  };
  const swipeThreshold = 100;

  // --- Helpers cancha actual ---
  const canchaRaw = canchas[index];

  const canchaNombre =
    typeof canchaRaw === "string"
      ? canchaRaw
      : canchaRaw?.nombre || "";

  // la seguimos calculando por si algún día la queremos usar en otro lado,
  // pero ya no la mostramos en el UI
  const canchaDescripcion =
    canchaRaw && typeof canchaRaw === "object"
      ? canchaRaw.descripcion || canchaRaw.description || ""
      : "";

  const canchaImagen =
    canchaRaw && typeof canchaRaw === "object"
      ? canchaRaw.imagen_url || canchaRaw.imagenUrl || homeHeroPadel
      : homeHeroPadel;

  const canchaKey = canchaNombre || String(canchaRaw || "");

  // 🔸 Horarios visibles para ESTA cancha:
  const horariosVisibles = useMemo(() => {
    if (
      horariosByCancha &&
      canchaNombre &&
      Array.isArray(horariosByCancha[canchaNombre]) &&
      horariosByCancha[canchaNombre].length > 0
    ) {
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

  const ocupacionPct = useMemo(() => {
    if (!canchaKey) return 0;
    const ocupados = horariosVisibles.reduce(
      (acc, h) => acc + (cantidades[`${canchaKey}-${h}`] || 0),
      0
    );
    const total = horariosVisibles.length * capacity;
    return total ? Math.round((ocupados / total) * 100) : 0;
  }, [cantidades, canchaKey, horariosVisibles, capacity]);

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
            key={`${index}-${canchaKey || "empty"}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 },
            }}
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
                <p className="text-slate-300">
                  No hay canchas para mostrar.
                </p>
              </div>
            ) : (
              <div
                className={`rounded-2xl p-0 overflow-hidden ${GOLD.card} ${GOLD.shadow}`}
              >
                {/* Imagen */}
                <div className="relative w-full h-40 md:h-52 bg-slate-900/50">
                  <img
                    src={canchaImagen}
                    alt={canchaNombre || "Cancha"}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3
                        className={`text-xl font-semibold tracking-tight text-white drop-shadow ${GOLD.accent}`}
                      >
                        {canchaNombre || "Cancha"}
                      </h3>
                      {/* 🔸 Descripción eliminada del UI */}
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {horariosVisibles.length} horarios disponibles
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-slate-200">
                        <div className="opacity-80">Ocupación</div>
                        <div className="text-base font-bold text-white">
                          {ocupacionPct}%
                        </div>
                      </div>
                      {onViewCancha && (
                        <button
                          type="button"
                          onClick={() => onViewCancha(canchaRaw)}
                          className={`px-3 py-1.5 text-xs rounded-full bg-slate-900/80 text-slate-100 border border-white/15 hover:bg-slate-800/90 ${GOLD.ring}`}
                        >
                          Ver cancha
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contenido abajo de la imagen */}
                <div className="p-6 md:p-7">
                  {/* Barra ocupación */}
                  <div className="mt-1 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${ocupacionPct}%` }}
                    />
                  </div>

                  {/* Horarios */}
                  <div className="mt-5">
                    <div className="flex flex-wrap gap-2">
                      {horariosVisibles.map((hora) => {
                        const { cantidad, lleno, restantes } =
                          disponibilidad(canchaKey, hora);
                        const selectedHere =
                          selected?.cancha === canchaKey &&
                          selected?.hora === hora;
                        const pasado = isPastSlot?.(hora);
                        const almostFull =
                          !lleno && !pasado && restantes <= 2;

                        const base =
                          "px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border " +
                          "inline-flex flex-col items-center justify-center min-w-[4.8rem]";
                        const stateCls = lleno
                          ? "cursor-not-allowed bg-white/5 text-rose-300 border-rose-500/40"
                          : pasado
                          ? "cursor-not-allowed bg-white/5 text-neutral-400 border-neutral-500/40"
                          : selectedHere
                          ? "bg-amber-400 text-[#0B1220] border-amber-400 shadow"
                          : almostFull
                          ? "bg-amber-400/10 text-amber-200 border-amber-400/60 hover:bg-amber-400/20"
                          : `${GOLD.chip} text-slate-100 hover:bg-white/10`;

                        const subtitle = lleno
                          ? "Lleno"
                          : pasado
                          ? "Pasado"
                          : `${cantidad}/${capacity}`;

                        return (
                          <button
                            key={hora}
                            className={`${base} ${stateCls} ${GOLD.ring}`}
                            disabled={!isAuthenticated || lleno || pasado}
                            onClick={() =>
                              onOpenDetail?.(canchaKey, hora)
                            }
                            title={
                              lleno
                                ? "No hay cupos"
                                : `Quedan ${restantes} cupos`
                            }
                            aria-label={`Horario ${hora} ${subtitle}`}
                          >
                            <span>{hora}</span>
                            <span className="text-[11px] leading-none opacity-80">
                              {subtitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pie: indicador y hint */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Usa ← → o arrastra para cambiar de cancha
                    </div>
                    <div className="flex items-center gap-1.5">
                      {canchas.map((_, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            setPage(([p]) => [
                              p + (i - index),
                              i > index ? 1 : -1,
                            ])
                          }
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === index
                              ? "bg-amber-400 scale-100"
                              : "bg-white/20 scale-90 hover:bg-white/30"
                          }`}
                          aria-label={`Ir a cancha ${i + 1}`}
                        />
                      ))}
                    </div>
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
