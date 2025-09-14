import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import MiToast from "../components/common/Toast/MiToast";
import ReservaCard from "../components/common/Cards/CardReserva"; 
import { FiCheckCircle } from "react-icons/fi";

// --- helpers
const generarFechas = () => {
  const fechas = [];
  const hoy = new Date();
  const options = { weekday: "long", day: "numeric", month: "long" };
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
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

// Función para derivar la cantidad real de jugadores
const derivePlayersCount = (r) => {
  if (Array.isArray(r.usuarios)) {
    const confirmados = r.usuarios.filter(u => u?.confirmacion === true).length;
    if (confirmados > 0) return confirmados;
    if (r.usuarios.length > 0) return r.usuarios.length;
  }
  if (Array.isArray(r.jugadores)) {
    const confirmados = r.jugadores.filter(u => u?.confirmacion === true).length;
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
  const { isEmpleado, apiFetch, isAuthenticated } = useContext(AuthContext);
  const fechas7 = useMemo(generarFechas, []);
  const [selectedDate, setSelectedDate] = useState(fechas7[0].value);

  const [reservas, setReservas] = useState([]);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [resultado, setResultado] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Solo empleados
  if (!isAuthenticated || !isEmpleado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-300">
        <h2 className="text-xl font-bold mb-4">Acceso restringido</h2>
        <p>Solo empleados pueden cargar resultados.</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchReservas = async () => {
      setLoading(true);
      setSelectedReserva(null);
      setResultado("");
      try {
        const resp = await apiFetch(`/api/reservas/listar?fecha=${selectedDate}`);
        if (resp.ok) {
          const data = await resp.json();
          // OJO con el casing del estado: normalizamos a minúsculas
          const confirmadas = data.filter(
            (r) => String(r.estado || "").toLowerCase() === "confirmada"
          );
          setReservas(confirmadas);
        } else {
          setReservas([]);
        }
      } catch {
        setReservas([]);
      }
      setLoading(false);
    };
    fetchReservas();
  }, [selectedDate, apiFetch]);

  const handleSelectReserva = async (reserva) => {
    setSelectedReserva(reserva);
    setResultado(""); // momentáneo
    try {
      const response = await apiFetch(`/api/empleado/resultado/${reserva._id}`);
      if (response.ok) {
        const data = await response.json();
        setResultado(data.resultado || "");
        setSelectedReserva({ ...reserva, resultado: data.resultado || "" });
      } else {
        setResultado("");
        setSelectedReserva({ ...reserva, resultado: "" });
      }
    } catch {
      setResultado("");
      setSelectedReserva({ ...reserva, resultado: "" });
    }
  };

  const handleCargarResultado = async () => {
    if (!selectedReserva || !resultado.trim()) {
      toast(
        <MiToast
          mensaje="Completa todos los campos"
          color="var(--color-red-400)"
        />
      );
      return;
    }
    setSaving(true);
    try {
      const resp = await apiFetch("/api/empleado/cargar_resultado", {
        method: "POST",
        body: JSON.stringify({
          reserva_id: selectedReserva._id,
          resultado: resultado.trim(),
        }),
      });
      if (resp.ok) {
        toast(
          <MiToast
            mensaje="Resultado guardado correctamente"
            color="var(--color-green-400)"
          />
        );
        // sync en lista y selección
        setReservas((prev) =>
          prev.map((r) =>
            r._id === selectedReserva._id
              ? { ...r, resultado: resultado.trim() }
              : r
          )
        );
        setSelectedReserva((prev) =>
          prev ? { ...prev, resultado: resultado.trim() } : prev
        );
      } else {
        const error = await resp.json();
        toast(
          <MiToast
            mensaje={error.detail || "Error al guardar resultado"}
            color="var(--color-red-400)"
          />
        );
      }
    } catch {
      toast(
        <MiToast mensaje="Error al guardar resultado" color="var(--color-red-400)" />
      );
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col items-center mt-8 min-h-[70vh] w-full py-6">
      <h2 className="text-xl font-bold text-white mb-4 text-center">
        Cargar Resultados de Reservas
      </h2>

      {/* Selector de fecha */}
      <div className="mb-6 w-full max-w-xs">
        <label
          htmlFor="fecha-select"
          className="block text-sm font-medium text-gray-300 mb-2 text-center"
        >
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

      {/* Listado de confirmadas usando ReservaCard */}
      <div className="w-full max-w-3xl">
        <h3 className="text-base font-semibold text-[#eaff00] mb-3 text-center">
          Reservas Confirmadas
        </h3>

        {loading ? (
          <div className="text-center text-gray-300">Cargando...</div>
        ) : reservas.length === 0 ? (
          <div className="text-center text-gray-400">
            No hay reservas confirmadas para esta fecha.
          </div>
        ) : (
          <ul className="space-y-3">
            {reservas.map((reserva) => {
              const isSelected = selectedReserva?._id === reserva._id;

              // Normalizar estado y fecha para la UI
              const estadoUI =
                String(reserva.estado || "").toLowerCase() === "confirmada"
                  ? "Confirmada"
                  : String(reserva.estado || "Reservada");

              const fechaUI =
                reserva.fecha && reserva.fecha !== "--/--/----"
                  ? reserva.fecha
                  : selectedDate;

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
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 text-emerald-300 ring-emerald-400/30">
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
            <span className="font-semibold">Jugador/Grupo:</span>{" "}
            {selectedReserva.usuario_nombre || "—"}
            <br />
            {selectedReserva.resultado && (
              <span>
                <span className="font-semibold text-[#eaff00]">Resultado actual:</span>{" "}
                {selectedReserva.resultado}
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
