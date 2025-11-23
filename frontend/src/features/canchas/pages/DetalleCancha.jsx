import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import backendClient from "../../../shared/services/backendClient";
import Button from "../../../shared/components/ui/Button/Button";
import homeHeroPadel from "../../../assets/images/homeHeroPadel.jpg";

function SectionTitle({ children }) {
  return (
    <h2 className="text-lg font-semibold text-gray-100 mb-3 border-b border-gray-700 pb-1">
      {children}
    </h2>
  );
}

export default function DetalleCancha() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Si venimos desde /reserva mando el objeto cancha por state
  const canchaFromState = location.state?.cancha || null;

  const [cancha, setCancha] = useState(canchaFromState);
  const [horariosMap, setHorariosMap] = useState({});
  const [loading, setLoading] = useState(!canchaFromState);
  const [loadingHorarios, setLoadingHorarios] = useState(true);
  const [error, setError] = useState("");

  // Cargar info de la cancha si entramos directo por URL o recargamos la página
  useEffect(() => {
    if (canchaFromState || !id) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // reutilizo el listar que ya usás en /reserva para no tocar el backend
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

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/reserva", { replace: true });
  };

  const handleIrAReservar = () => {
    // de momento solo te llevo al flujo normal de reservas
    navigate("/reserva");
  };

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

  const imageSrc = cancha.imagen_url || homeHeroPadel;
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

        {/* Hero imagen */}
        <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-lg mb-6">
          <img
            src={imageSrc}
            alt={cancha.nombre}
            className="w-full max-h-[380px] object-cover"
          />
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
              texto="Reservar en esta cancha"
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

          {/* Columna derecha: horarios habilitados */}
          <div>
            <SectionTitle>Horarios habilitados</SectionTitle>

            {loadingHorarios && (
              <p className="text-sm text-gray-400 mb-2">
                Cargando horarios disponibles…
              </p>
            )}

            {horariosHabilitados.length === 0 && !loadingHorarios ? (
              <p className="text-sm text-gray-400">
                Esta cancha todavía no tiene horarios habilitados.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {horariosHabilitados.map((h) => (
                  <span
                    key={h}
                    className="px-3 py-1 rounded-full bg-slate-800 text-xs md:text-sm text-gray-100 border border-slate-700"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            <p className="text-[11px] text-gray-500 mt-3">
              Los horarios que ves acá son los que el administrador habilitó
              para esta cancha. La disponibilidad real (canchas ya reservadas)
              la ves en la pantalla de reservas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
