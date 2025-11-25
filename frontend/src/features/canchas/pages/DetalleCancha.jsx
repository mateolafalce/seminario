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

// ===== helpers de fechas (mismo criterio que en Reserva) =====
const generarFechas = () => {
  const r = [];
  const hoy = new Date();
  const opt = { weekday: "long", day: "numeric", month: "long" };

  for (let i = 0; i < 7; i++) {
    const f = new Date(hoy);
    f.setDate(hoy.getDate() + i);
    r.push({
      display: new Intl.DateTimeFormat("es-ES", opt)
        .format(f)
        .replace(/^\w/, (c) => c.toUpperCase()),
      value: `${String(f.getDate()).padStart(2, "0")}-${String(
        f.getMonth() + 1
      ).padStart(2, "0")}-${f.getFullYear()}`,
    });
  }
  return r;
};
const FECHAS = generarFechas();

function SectionTitle({ children }) {
  return (
    <h2 className="text-lg font-semibold text-gray-100 mb-3 border-b border-gray-700 pb-1">
      {children}
    </h2>
  );
}

// slot pasado? (igual lógica que en reserva)
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

  // Si venimos desde /reserva mando el objeto cancha por state
  const canchaFromState = location.state?.cancha || null;

  const [cancha, setCancha] = useState(canchaFromState);
  const [horariosMap, setHorariosMap] = useState({});
  const [loading, setLoading] = useState(!canchaFromState);
  const [loadingHorarios, setLoadingHorarios] = useState(true);
  const [error, setError] = useState("");

  // reservas / ocupación
  const [selectedDate, setSelectedDate] = useState(FECHAS[0].value);
  const [ocupacion, setOcupacion] = useState({}); // key = "cancha|horario" → cantidad
  const [loadingOcupacion, setLoadingOcupacion] = useState(false);

  const [reservaPendiente, setReservaPendiente] = useState(null);
  const [mensajeConfirm, setMensajeConfirm] = useState("");
  const [imgIndex, setImgIndex] = useState(0);

  // =========================
  // Carga de datos
  // =========================

  // Cargar info de la cancha si entramos directo por URL o recargamos la página
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

        if (!alive) return;

        if (found) {
          setCancha(found);
        } else {
          setError("No se encontró la cancha.");
        }
      } catch (e) {
        if (!alive) return;
        setError("Error al cargar la cancha.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, canchaFromState]);

  // Cargar todos los horarios para poder traducir los ids a "HH:MM-HH:MM"
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

  // Cargar ocupación por horario para la fecha seleccionada
  useEffect(() => {
    if (!cancha) return;
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

  const handleIrAReservar = () => {
    navigate("/reserva");
  };

  // click en un horario dentro del detalle
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

    setReservaPendiente({
      cancha: cancha.nombre,
      horario: hora,
    });
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
      toast(
        <MiToast
          mensaje={msg}
          color="var(--color-red-400)"
        />
      );
    } finally {
      setReservaPendiente(null);
      setMensajeConfirm("");
    }
  };

  const handleCancelReserva = () => {
    setReservaPendiente(null);
    setMensajeConfirm("");
  };

  // =========================
  // Render
  // =========================

  if (loading || !cancha) {
    return (
      <div className="min-h-[70vh] bg-slate-950 text-gray-100 flex flex-col items-center justify-center px-4">
        {error ? (
          <>
            <p className="mb-4 text-red-400">{error}</p>
            <Button texto="Volver" onClick={handleBack} variant="crear" />
          </>
        ) : (
          <p>Cargando cancha...</p>
        )}
      </div>
    );
  }

  // Armamos el array de imágenes: principal + secundarias
  const imagenesSecundarias = Array.isArray(cancha.imagenes)
    ? cancha.imagenes
    : [];

  const imagenesTotal = [
    cancha.imagen_url ? getFileUrl(cancha.imagen_url) : null,
    ...imagenesSecundarias.map((img) =>
      img ? getFileUrl(img) : null
    ),
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
      : "Esta cancha aún no tiene una descripción cargada.";

  const horariosHabilitados =
    Array.isArray(cancha.horarios) && cancha.horarios.length > 0
      ? cancha.horarios
          .map((hid) => horariosMap[String(hid)] || null)
          .filter(Boolean)
      : [];

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Volver atrás */}
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          <span className="text-lg">‹</span>
          <span>Volver</span>
        </button>

        {/* Hero imagen como carrusel */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-lg mb-6">
          <img
            src={imageSrc}
            alt={cancha.nombre}
            className="w-full max-h-[380px] object-cover"
          />

          {totalImagenes > 1 && (
            <>
              {/* Flecha izquierda */}
              <button
                type="button"
                onClick={() =>
                  setImgIndex((prev) =>
                    prev === 0 ? totalImagenes - 1 : prev - 1
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center border border-white/30"
                aria-label="Imagen anterior"
              >
                ‹
              </button>

              {/* Flecha derecha */}
              <button
                type="button"
                onClick={() =>
                  setImgIndex((prev) =>
                    prev === totalImagenes - 1 ? 0 : prev + 1
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center border border-white/30"
                aria-label="Imagen siguiente"
              >
                ›
              </button>

              {/* Indicadores (puntitos) */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {imagenesTotal.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${
                      i === safeIndex ? "bg-amber-400" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cabecera cancha + CTA reservar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {cancha.nombre}
            </h1>
            <p className="text-sm text-gray-400">
              Cancha disponible para reservas en Boulevard 81
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              texto="Ir a pantalla de reservas"
              onClick={handleIrAReservar}
              variant="crear"
              size="pill"
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr,1.2fr] gap-8">
          {/* Columna izquierda: descripción */}
          <div>
            <SectionTitle>Descripción de la cancha</SectionTitle>
            <p className="text-sm md:text-base text-gray-200 leading-relaxed whitespace-pre-line">
              {descripcion}
            </p>
          </div>

          {/* Columna derecha: horarios habilitados con ocupación */}
          <div>
            <SectionTitle>Horarios disponibles</SectionTitle>

            {/* selector de fecha para la reserva */}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-gray-400">
                Elegí una fecha y luego un horario para reservar:
              </span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto bg-slate-900 border border-slate-700 text-xs text-gray-100 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/70"
              >
                {FECHAS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.display}
                  </option>
                ))}
              </select>
            </div>

            {(loadingHorarios || loadingOcupacion) && (
              <p className="text-sm text-gray-400 mb-2">
                Cargando horarios disponibles…
              </p>
            )}

            {horariosHabilitados.length === 0 && !loadingHorarios ? (
              <p className="text-sm text-gray-400">
                Esta cancha todavía no tiene horarios habilitados.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {horariosHabilitados.map((h) => {
                  const key = `${cancha.nombre}__${h}`;
                  const cantidad = ocupacion[key] ?? 0;
                  const past = esHorarioPasado(selectedDate, h);
                  const labelBottom = past ? "Pasado" : `${cantidad}/6`;

                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={past}
                      onClick={() => !past && handleClickHorario(h)}
                      className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-full border text-xs min-w-[110px] transition-colors ${
                        past
                          ? "border-slate-700 bg-slate-800/70 text-gray-500 cursor-not-allowed"
                          : "border-slate-600 bg-slate-800/80 text-gray-100 hover:border-amber-400 hover:bg-amber-400/15 cursor-pointer"
                      }`}
                    >
                      <span className="text-sm font-medium">{h}</span>
                      <span className="text-[11px] mt-0.5 text-gray-400">
                        {labelBottom}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-gray-500 mt-3">
              Estos horarios y cupos son los mismos que ves en la pantalla de
              reservas. Los que figuran como <strong>Pasado</strong> no se
              pueden reservar.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de reserva (mismo que usás en reservas) */}
      <MessageConfirm
        mensaje={mensajeConfirm}
        onClose={handleCancelReserva}
        onConfirm={handleConfirmReserva}
        onCancel={handleCancelReserva}
      />
    </div>
  );
}
