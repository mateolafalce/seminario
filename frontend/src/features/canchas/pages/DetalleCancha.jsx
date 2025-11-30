import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import backendClient from "../../../shared/services/backendClient";
import Button from "../../../shared/components/ui/Button/Button";
import homeHeroPadel from "../../../assets/images/homeHeroPadel.jpg";
import MessageConfirm from "../../../shared/components/ui/Confirm/MessageConfirm";
import MiToast from "../../../shared/components/ui/Toast/MiToast";
import { toast } from "react-toastify";
import { AuthContext } from "../../auth/context/AuthContext";
import { getFileUrl } from "../../../app/config";
import { isCanchaDisponibleEnFecha } from "../../../shared/utils/disponibilidadCancha";

import { motion, AnimatePresence } from "framer-motion";

// ===== Helpers de fechas =====
const generarFechas = () => {
  const r = [];
  const hoy = new Date();

  const optDia = { weekday: "short" };
  const optNum = { day: "numeric" };
  const optMes = { month: "short" };

  for (let i = 0; i < 14; i++) {
    const f = new Date(hoy);
    f.setDate(hoy.getDate() + i);

    const value = `${String(f.getDate()).padStart(2, "0")}-${String(
      f.getMonth() + 1
    ).padStart(2, "0")}-${f.getFullYear()}`;

    const nombreDia = new Intl.DateTimeFormat("es-ES", optDia)
      .format(f)
      .replace(".", "");
    const numeroDia = new Intl.DateTimeFormat("es-ES", optNum).format(f);
    const nombreMes = new Intl.DateTimeFormat("es-ES", optMes)
      .format(f)
      .replace(".", "");

    r.push({
      value,
      nombreDia: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1),
      numeroDia,
      nombreMes,
      fullDate: f,
    });
  }
  return r;
};

const FECHAS_BASE = generarFechas();

// ¿El horario ya pasó?
function esHorarioPasado(fechaStr, horarioStr) {
  try {
    const [dd, mm, yyyy] = fechaStr.split("-").map(Number);
    const [horaInicio] = horarioStr.split("-");
    const [hh, min] = horaInicio.split(":").map(Number);
    const slotDate = new Date(yyyy, mm - 1, dd, hh, min || 0);
    const ahora = new Date();
    return slotDate <= ahora;
  } catch {
    return false;
  }
}

export default function DetalleCancha() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const canchaFromState = location.state?.cancha || null;

  const [cancha, setCancha] = useState(canchaFromState);
  const [horariosMap, setHorariosMap] = useState({});
  const [loading, setLoading] = useState(!canchaFromState);
  const [loadingHorarios, setLoadingHorarios] = useState(true);
  const [error, setError] = useState("");

  // Reservas / ocupación
  const [selectedDate, setSelectedDate] = useState("");
  const [fechasDisponibles, setFechasDisponibles] = useState([]);
  const [ocupacion, setOcupacion] = useState({});
  const [loadingOcupacion, setLoadingOcupacion] = useState(false);

  const [reservaPendiente, setReservaPendiente] = useState(null);
  const [mensajeConfirm, setMensajeConfirm] = useState("");

  const [imgIndex, setImgIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 izq, 1 der

  // =========================
  // Carga de cancha
  // =========================
  useEffect(() => {
    if (canchaFromState || !id) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await backendClient.get("canchas/listar");
        const arr = Array.isArray(data) ? data : [];
        const found =
          arr.find((c) => String(c.id) === id) ||
          arr.find((c) => String(c._id) === id);
        if (alive) {
          if (found) setCancha(found);
          else setError("No se encontró la cancha.");
        }
      } catch (e) {
        if (alive) setError("Error al cargar la cancha.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, canchaFromState]);

  // Filtrar días según disponibilidad real de la cancha
  useEffect(() => {
    if (!cancha) return;

    const filtradas = FECHAS_BASE.filter((f) => {
      const y = f.fullDate.getFullYear();
      const m = String(f.fullDate.getMonth() + 1).padStart(2, "0");
      const d = String(f.fullDate.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`; // YYYY-MM-DD
      return isCanchaDisponibleEnFecha(cancha, iso);
    });

    setFechasDisponibles(filtradas);

    setSelectedDate((prev) => {
      if (prev && filtradas.some((f) => f.value === prev)) return prev;
      return filtradas[0]?.value || "";
    });
  }, [cancha]);

  // Cargar horarios
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingHorarios(true);
        const data = await backendClient.get("horarios/listar");
        const map = {};
        (Array.isArray(data) ? data : []).forEach((h) => {
          if (!h) return;
          const key = String(h.id || h._id || "");
          if (key) map[key] = h.hora;
        });
        if (alive) setHorariosMap(map);
      } catch (e) {
        if (alive) console.error("Error cargando horarios:", e);
      } finally {
        if (alive) setLoadingHorarios(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Cargar ocupación por fecha
  useEffect(() => {
    if (!cancha || !selectedDate) return;

    let alive = true;
    (async () => {
      try {
        setLoadingOcupacion(true);
        const data = await backendClient.get(
          `reservas/cantidad?fecha=${selectedDate}`
        );
        const map = {};
        (Array.isArray(data) ? data : []).forEach((item) => {
          if (!item) return;
          const key = `${item.cancha}__${item.horario}`;
          map[key] = item.cantidad ?? 0;
        });
        if (alive) setOcupacion(map);
      } catch (e) {
        if (alive) console.error("Error cargando ocupación:", e);
      } finally {
        if (alive) setLoadingOcupacion(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedDate, cancha]);

  // =========================
  // Handlers
  // =========================
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/reserva", { replace: true });
  };

  const handleClickHorario = (hora) => {
    if (!user) {
      toast(
        <MiToast
          mensaje="Iniciá sesión para reservar."
          color="var(--color-red-400)"
        />
      );
      return;
    }
    if (!cancha) return;

    setReservaPendiente({ cancha: cancha.nombre, horario: hora });
    setMensajeConfirm(
      `¿Confirmás reservar "${cancha.nombre}" a las ${hora} para el ${selectedDate}?`
    );
  };

  const handleConfirmReserva = async () => {
    if (!reservaPendiente) return;
    try {
      const resp = await backendClient.post("reservas/reservar", {
        cancha: reservaPendiente.cancha,
        horario: reservaPendiente.horario,
        fecha: selectedDate,
      });
      toast(
        <MiToast
          mensaje={`Reserva exitosa: ${resp?.msg || "OK"}`}
          color="var(--color-green-400)"
        />
      );
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Error al intentar reservar.";
      toast(<MiToast mensaje={msg} color="var(--color-red-400)" />);
    } finally {
      setReservaPendiente(null);
      setMensajeConfirm("");
    }
  };

  const handleCancelReserva = () => {
    setReservaPendiente(null);
    setMensajeConfirm("");
  };

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setImgIndex((prev) => {
      if (newDirection === 1) return prev === totalImagenes - 1 ? 0 : prev + 1;
      return prev === 0 ? totalImagenes - 1 : prev - 1;
    });
  };

  // =========================
  // Render
  // =========================
  if (loading || !cancha) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">Cargando cancha...</p>
      </div>
    );
  }

  const imagenesSecundarias = Array.isArray(cancha.imagenes)
    ? cancha.imagenes
    : [];
  const imagenesTotal = [
    cancha.imagen_url ? getFileUrl(cancha.imagen_url) : null,
    ...imagenesSecundarias.map((img) => (img ? getFileUrl(img) : null)),
  ].filter(Boolean);

  const totalImagenes = imagenesTotal.length;
  const safeIndex =
    totalImagenes > 0 && imgIndex >= 0 && imgIndex < totalImagenes
      ? imgIndex
      : 0;
  const imageSrc =
    totalImagenes > 0 ? imagenesTotal[safeIndex] : homeHeroPadel;

  const descripcion =
    cancha.descripcion && cancha.descripcion.trim().length
      ? cancha.descripcion
      : "Sin descripción disponible.";

  const horariosHabilitados =
    Array.isArray(cancha.horarios) && cancha.horarios.length > 0
      ? cancha.horarios
          .map((hid) => horariosMap[String(hid)] || null)
          .filter(Boolean)
      : [];

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  const mesLabel = (() => {
    if (!fechasDisponibles.length) return "";
    const primero = fechasDisponibles[0].nombreMes;
    const ultimo = fechasDisponibles[fechasDisponibles.length - 1].nombreMes;
    return primero === ultimo ? primero : `${primero} - ${ultimo}`;
  })();

  // Días disponibles (solo para mostrar info de la cancha)
  const diasResumen = (() => {
    if (!fechasDisponibles.length) return [];

    const mapCompleto = {
      Lun: "Lunes",
      Mar: "Martes",
      Mié: "Miércoles",
      Jue: "Jueves",
      Vie: "Viernes",
      Sáb: "Sábado",
      Dom: "Domingo",
    };

    const set = new Set();
    for (const f of fechasDisponibles) {
      if (!f?.nombreDia) continue;
      const clave = f.nombreDia; // "Lun", "Mar", etc
      set.add(mapCompleto[clave] || clave);
    }
    return Array.from(set);
  })();

  // Helpers para manejar el input type="date"
  const formatDateLocal = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`; // YYYY-MM-DD
  };

  const toISODate = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const [dd, mm, yyyy] = ddmmyyyy.split("-").map(Number);
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  };

  const fromISODate = (iso) => {
    if (!iso) return "";
    const [yyyy, mm, dd] = iso.split("-");
    if (!yyyy || !mm || !dd) return "";
    return `${dd}-${mm}-${yyyy}`; // vuelve a tu formato DD-MM-YYYY
  };

  const dateInputValue = toISODate(selectedDate);

  const minDate = fechasDisponibles[0]
    ? formatDateLocal(fechasDisponibles[0].fullDate)
    : "";

  const maxDate = fechasDisponibles[fechasDisponibles.length - 1]
    ? formatDateLocal(
        fechasDisponibles[fechasDisponibles.length - 1].fullDate
      )
    : "";

  const diaSeleccionValido = selectedDate
    ? fechasDisponibles.some((f) => f.value === selectedDate)
    : false;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 md:pb-10 relative">
      {/* HERO */}
      <div className="relative w-full h-[45vh] md:h-[60vh] md:max-w-6xl md:mx-auto md:mt-6 md:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl group">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10 transition-all"
        >
          <span className="text-lg leading-none pb-0.5">‹</span>
          <span className="text-sm font-medium">Volver</span>
        </button>

        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={imgIndex}
            src={imageSrc}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute w-full h-full object-cover"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -10000) paginate(1);
              else if (swipe > 10000) paginate(-1);
            }}
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90 md:opacity-60 pointer-events-none" />

        <div className="absolute bottom-6 left-4 right-4 z-10 md:bottom-10 md:left-10">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl md:text-5xl font-bold text-white drop-shadow-md mb-1"
          >
            {cancha.nombre}
          </motion.h1>
          <div className="flex items-center gap-2">
            <span className="bg-yellow-400 text-slate-950 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
              PROFESIONAL
            </span>
            <span className="text-gray-300 text-sm drop-shadow-md">
              Boulevard 81
            </span>
          </div>
        </div>

        {totalImagenes > 1 && (
          <>
            <button
              onClick={() => paginate(-1)}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-yellow-400 hover:text-black text-white backdrop-blur transition-all"
            >
              ‹
            </button>
            <button
              onClick={() => paginate(1)}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-yellow-400 hover:text-black text-white backdrop-blur transition-all"
            >
              ›
            </button>

            <div className="absolute bottom-4 right-4 flex gap-1.5 z-20">
              {imagenesTotal.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                    i === safeIndex ? "bg-yellow-400 w-6" : "bg-white/50 w-1.5"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* CONTENIDO */}
      <div className="relative z-10 -mt-4 md:mt-8 px-0 md:px-4 max-w-6xl mx-auto">
        <div className="bg-slate-950 md:bg-transparent rounded-t-3xl md:rounded-none px-5 pt-8 md:pt-0 pb-10 grid grid-cols-1 md:grid-cols-[1.5fr,1fr] gap-10">
          {/* Descripción */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-yellow-400 rounded-full"></span>
              Sobre la cancha
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-line">
              {descripcion}
            </p>
          </div>

          {/* COLUMNA DERECHA: info de disponibilidad + reserva */}
          <div className="md:sticky md:top-4 space-y-4">
            {/* 1) Resumen simple de la cancha */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                Disponibilidad de la cancha
              </h3>

              <div className="space-y-4 text-xs md:text-sm">
                {/* DÍAS DISPONIBLES */}
                <div>
                  <p className="text-slate-400 mb-1 font-semibold">
                    Días disponibles
                  </p>
                  {diasResumen.length ? (
                    <div className="flex flex-wrap gap-2">
                      {diasResumen.map((dia) => (
                        <span
                          key={dia}
                          className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-100 border border-slate-700 text-xs"
                        >
                          {dia}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">
                      Esta cancha todavía no tiene días configurados.
                    </p>
                  )}
                </div>

                {/* HORARIOS DISPONIBLES */}
                <div className="pt-1 border-t border-slate-800/60">
                  <p className="text-slate-400 mb-1 font-semibold mt-2">
                    Horarios disponibles
                  </p>
                  {horariosHabilitados.length ? (
                    <div className="flex flex-wrap gap-2">
                      {horariosHabilitados.map((h) => (
                        <span
                          key={h}
                          className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-100 border border-slate-700 text-xs"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">
                      No hay horarios configurados para esta cancha.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2) Tarjeta de reserva: calendario + horarios del día */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5">
              {/* Encabezado */}
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reservar un turno
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Elegí una fecha y luego un horario disponible.
                  </p>
                </div>
                <span className="hidden md:inline text-xs text-yellow-400">
                  {mesLabel}
                </span>
              </div>

              {/* Selector de fecha (input type="date") */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Fecha
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateInputValue}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => {
                      const iso = e.target.value; // YYYY-MM-DD
                      const ddmmyyyy = fromISODate(iso);
                      setSelectedDate(ddmmyyyy);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 [color-scheme:dark]"
                  />
                </div>
                {!fechasDisponibles.length && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    No hay días habilitados para reservar en las próximas semanas.
                  </p>
                )}
              </div>

              {/* Horarios para la fecha seleccionada */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase">
                    Horarios para el día seleccionado
                  </p>
                  {loadingOcupacion && (
                    <span className="text-[11px] text-gray-500 animate-pulse">
                      Actualizando cupos...
                    </span>
                  )}
                </div>

                {!selectedDate && (
                  <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl">
                    <p className="text-gray-500 text-sm">
                      Elegí primero una fecha.
                    </p>
                  </div>
                )}

                {selectedDate && !diaSeleccionValido && (
                  <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl">
                    <p className="text-gray-500 text-sm">
                      La cancha no está habilitada para la fecha seleccionada.
                    </p>
                  </div>
                )}

                {selectedDate &&
                  diaSeleccionValido &&
                  horariosHabilitados.length === 0 &&
                  !loadingHorarios && (
                    <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl">
                      <p className="text-gray-500 text-sm">
                        No hay horarios disponibles para ese día.
                      </p>
                    </div>
                  )}

                {selectedDate && diaSeleccionValido && horariosHabilitados.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {horariosHabilitados.map((h) => {
                      const key = `${cancha.nombre}__${h}`;
                      const cantidad = ocupacion[key] ?? 0;
                      const past = esHorarioPasado(selectedDate, h);

                      const base =
                        "relative py-2.5 rounded-lg border text-center text-xs md:text-sm transition-all";
                      const pastStyle =
                        "border-slate-800 bg-slate-800/30 text-slate-600 cursor-not-allowed";
                      const availStyle =
                        "border-slate-600 bg-slate-800 hover:border-yellow-400 hover:text-yellow-400 text-gray-200 cursor-pointer active:scale-95";

                      return (
                        <button
                          key={h}
                          disabled={past}
                          onClick={() => !past && handleClickHorario(h)}
                          className={`${base} ${past ? pastStyle : availStyle}`}
                        >
                          <span className="font-bold block">{h}</span>
                          <span
                            className={`text-[10px] ${
                              past ? "text-slate-700" : "text-green-500"
                            }`}
                          >
                            {past ? "Cerrado" : `${cantidad}/6`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MessageConfirm
        mensaje={mensajeConfirm}
        onClose={handleCancelReserva}
        onConfirm={handleConfirmReserva}
        onCancel={handleCancelReserva}
      />
    </div>
  );
}
