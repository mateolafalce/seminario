import { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../../auth/context/AuthContext";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";
import ReservaCard from "../components/CardReserva";
import resultadosApi from "../../../shared/services/resultadosApi";
import backendClient from "../../../shared/services/backendClient";
import { canManageReservas } from '../../../shared/utils/permissions';
import { Navigate } from 'react-router-dom';

// --- helpers
const generarFechas = () => {
  const fechas = [];
  const hoy = new Date();
  const options = { weekday: "long", day: "numeric", month: "long" };
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    const display = new Intl.DateTimeFormat("es-ES", options).format(fecha);
    const value = `${String(fecha.getDate()).padStart(2, "0")}-${String(
      fecha.getMonth() + 1
    ).padStart(2, "0")}-${fecha.getFullYear()}`;
    fechas.push({
      display: display.charAt(0).toUpperCase() + display.slice(1),
      value,
    });
  }
  return fechas;
};

// Derivar cantidad de jugadores
const derivePlayersCount = (r) => {
  if (Array.isArray(r.usuarios)) {
    const confirmados = r.usuarios.filter(u => u?.confirmado === true).length;
    if (confirmados > 0) return confirmados;
    if (r.usuarios.length > 0) return r.usuarios.length;
  }
  if (Array.isArray(r.jugadores)) {
    const confirmados = r.jugadores.filter(u => u?.confirmado === true).length;
    if (confirmados > 0) return confirmados;
    if (r.jugadores.length > 0) return r.jugadores.length;
  }
  if (typeof r.usuario_nombre === "string" && r.usuario_nombre.trim()) {
    const n = r.usuario_nombre.split(",").map(s => s.trim()).filter(Boolean).length;
    if (n > 0) return n;
  }
  if (typeof r.cantidad_usuarios === "number") return r.cantidad_usuarios;
  return 1;
};

function CargarResultados() {
  const { isAuthenticated, roles, permissions } = useContext(AuthContext);
  const me = { roles, permissions };
  const puedeCargar = canManageReservas(me) || permissions?.includes('reservas.resultado.cargar');

  const fechas7 = useMemo(generarFechas, []);
  const [selectedDate, setSelectedDate] = useState(fechas7[0].value);

  const [reservas, setReservas] = useState([]);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [resultado, setResultado] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔧 Hook SIEMPRE llamado: el cuerpo se corta si no hay permisos
  useEffect(() => {
    // si no tiene acceso, limpiar y salir
    if (!isAuthenticated || !puedeCargar) {
      setReservas([]);
      setSelectedReserva(null);
      setResultado("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchReservas = async () => {
      setLoading(true);
      setSelectedReserva(null);
      setResultado("");
      try {
        // backendClient.get devuelve JSON ya parseado
        const data = await backendClient.get("reservas/listar", { fecha: selectedDate });
        const confirmadas = (data || []).filter(
          (r) => String(r.estado || "").toLowerCase() === "confirmada"
        );
        if (!cancelled) setReservas(confirmadas);
      } catch {
        if (!cancelled) setReservas([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReservas();
    return () => { cancelled = true; };
  }, [selectedDate, isAuthenticated, puedeCargar]);

  const handleSelectReserva = async (reserva) => {
    setSelectedReserva(reserva);
    setResultado("");
    try {
      const data = await resultadosApi.ver(reserva._id); // <- JSON directo
      const resTxt = data?.resultado || "";
      setResultado(resTxt);
      setSelectedReserva({ ...reserva, resultado: resTxt });
    } catch {
      setResultado("");
      setSelectedReserva({ ...reserva, resultado: "" });
    }
  };

  const handleCargarResultado = async () => {
    if (!selectedReserva || !resultado.trim()) {
      toast(<MiToast mensaje="Completa todos los campos" color="var(--color-red-400)" />);
      return;
    }
    setSaving(true);
    try {
      await resultadosApi.cargar(selectedReserva._id, resultado.trim()); // <- success/throws
      toast(<MiToast mensaje="Resultado guardado correctamente" color="var(--color-green-400)" />);
      setReservas((prev) =>
        prev.map((r) => (r._id === selectedReserva._id ? { ...r, resultado: resultado.trim() } : r))
      );
      setSelectedReserva((prev) => (prev ? { ...prev, resultado: resultado.trim() } : prev));
    } catch (err) {
      const msg = err?.message || "Error al guardar resultado";
      toast(<MiToast mensaje={msg} color="var(--color-red-400)" />);
    }
    setSaving(false);
  };

  // 🔐 Gate de acceso (ahora después de TODOS los hooks)
  if (!isAuthenticated || !puedeCargar) return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col items-center mt-8 min-h-[70vh] w-full py-6">
      <h2 className="text-xl font-bold text-white mb-4 text-center">
        Cargar Resultados de Reservas
      </h2>

      {/* Selector de fecha */}
      <div className="mb-6 w-full max-w-xs">
        <label htmlFor="fecha-select" className="block text-sm font-medium text-gray-300 mb-2 text-center">
          Selecciona una fecha:
        </label>
        <select
          id="fecha-select"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
        >
          {fechas7.map((f) => (
            <option key={f.value} value={f.value}>
              {f.display}
            </option>
          ))}
        </select>
      </div>

      {/* Listado de confirmadas */}
      <div className="w-full max-w-3xl">
        <h3 className="text-base font-semibold text-[#eaff00] mb-3 text-center">Reservas Confirmadas</h3>
        {loading ? (
          <div className="text-center text-gray-300">Cargando...</div>
        ) : reservas.length === 0 ? (
          <div className="text-center text-gray-400">No hay reservas confirmadas para esta fecha.</div>
        ) : (
          <ul className="space-y-3">
            {reservas.map((reserva) => {
              const isSelected = selectedReserva?._id === reserva._id;

              const estadoUI =
                String(reserva.estado || "").toLowerCase() === "confirmada" ? "Confirmada" : String(reserva.estado || "Reservada");

              const fechaUI = reserva.fecha && reserva.fecha !== "--/--/----" ? reserva.fecha : selectedDate;

              const reservaUI = { ...reserva, estado: estadoUI, fecha: fechaUI };
              const playersCount = derivePlayersCount(reserva);

              return (
                <ReservaCard
                  key={reserva._id}
                  mode="historial"
                  variant="empleado"
                  selected={isSelected}
                  reserva={reservaUI}
                  playersCountOverride={playersCount}
                  bottomActions={
                    isSelected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-emerald-400/30">
                        ✓ Seleccionada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectReserva(reserva)}
                        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-amber-300 ring-1 ring-amber-400/30 hover:ring-amber-400/50 hover:bg-amber-400/10 transition"
                      >
                        Seleccionar
                      </button>
                    )
                  }
                />
              );
            })}
          </ul>
        )}
      </div>

      {/* Panel de edición del resultado */}
      {selectedReserva && (
        <div className="mt-6 w-full max-w-md bg-gray-900 rounded-lg p-6">
          <h4 className="text-lg font-bold text-[#eaff00] mb-2 text-center">
            {selectedReserva.resultado ? "Modificar resultado" : "Cargar resultado"} para la reserva
          </h4>

          <div className="mb-2 text-gray-200 text-sm">
            <span className="font-semibold">Cancha:</span> {selectedReserva.cancha}
            <br />
            <span className="font-semibold">Horario:</span> {selectedReserva.horario}
            <br />
            <span className="font-semibold">Jugador/Grupo:</span> {selectedReserva.usuario_nombre || "—"}
            <br />
            {selectedReserva.resultado && (
              <span>
                <span className="font-semibold text-[#eaff00]">Resultado actual:</span> {selectedReserva.resultado}
              </span>
            )}
          </div>

          <textarea
            className="w-full p-2 rounded bg-gray-800 text-white mb-4"
            rows={3}
            placeholder="Escribe el resultado..."
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
          />

          <button
            className="bg-[#eaff00] text-[#0D1B2A] px-4 py-2 rounded font-bold w-full disabled:opacity-70"
            onClick={handleCargarResultado}
            disabled={saving}
          >
            {saving ? "Guardando..." : selectedReserva.resultado ? "Modificar Resultado" : "Cargar Resultado"}
          </button>
        </div>
      )}
    </div>
  );
}

export default CargarResultados;
