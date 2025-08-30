import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import MiToast from "../components/common/Toast/MiToast";

const generarFechas = () => {
  const fechas = [];
  const hoy = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    const display = new Intl.DateTimeFormat('es-ES', options).format(fecha);
    const value = `${String(fecha.getDate()).padStart(2, '0')}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${fecha.getFullYear()}`;
    fechas.push({ display: display.charAt(0).toUpperCase() + display.slice(1), value });
  }
  return fechas;
};

function CargarResultados() {
  const { isEmpleado, apiFetch, isAuthenticated } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(generarFechas()[0].value);
  const [reservas, setReservas] = useState([]);
  const [resultado, setResultado] = useState("");
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [loading, setLoading] = useState(false);

  // Solo empleados pueden ver este componente
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
      try {
        const response = await apiFetch(`/api/reservas/listar?fecha=${selectedDate}`);
        if (response.ok) {
          const data = await response.json();
          // Filtra solo reservas confirmadas
          const confirmadas = data.filter(r => r.estado === "confirmada");
          setReservas(confirmadas);
        } else {
          setReservas([]);
        }
      } catch (err) {
        setReservas([]);
      }
      setLoading(false);
    };
    fetchReservas();
  }, [selectedDate, apiFetch]);

  const handleCargarResultado = async () => {
    if (!selectedReserva || !resultado.trim()) {
      toast(<MiToast mensaje="Completa todos los campos" color="var(--color-red-400)" />);
      return;
    }
    try {
      const response = await apiFetch("/api/empleado/cargar_resultado", {
        method: "POST",
        body: JSON.stringify({
          reserva_id: selectedReserva._id,
          resultado: resultado.trim()
        })
      });
      if (response.ok) {
        toast(<MiToast mensaje="Resultado guardado correctamente" color="var(--color-green-400)" />);
        // Actualiza el resultado en la reserva seleccionada y en el listado
        setReservas(prev =>
          prev.map(r =>
            r._id === selectedReserva._id
              ? { ...r, resultado: resultado.trim() }
              : r
          )
        );
        setSelectedReserva({ ...selectedReserva, resultado: resultado.trim() });
        // No limpies el resultado ni deselecciones la reserva
      } else {
        const error = await response.json();
        toast(<MiToast mensaje={error.detail || "Error al guardar resultado"} color="var(--color-red-400)" />);
      }
    } catch (err) {
      toast(<MiToast mensaje="Error al guardar resultado" color="var(--color-red-400)" />);
    }
  };

  const handleSelectReserva = async (reserva) => {
    setSelectedReserva(reserva);
    setResultado(""); // Limpia el campo antes de la petición
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
    } catch (err) {
      setResultado("");
      setSelectedReserva({ ...reserva, resultado: "" });
    }
  };

  return (
    <div className="flex flex-col items-center mt-8 min-h-[70vh] bg-[#101a2a] w-full py-6">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Cargar Resultados de Reservas</h2>
      <div className="mb-6 w-full max-w-xs">
        <label htmlFor="fecha-select" className="block text-sm font-medium text-gray-300 mb-2 text-center">Selecciona una fecha:</label>
        <select
          id="fecha-select"
          value={selectedDate}
          onChange={e => {
            setSelectedDate(e.target.value);
            setSelectedReserva(null);
          }}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
        >
          {generarFechas().map(fecha => (
            <option key={fecha.value} value={fecha.value}>{fecha.display}</option>
          ))}
        </select>
      </div>
      <div className="w-full max-w-3xl bg-gray-800 rounded-xl p-4">
        <h3 className="text-base font-semibold text-[#eaff00] mb-3 text-center">Reservas Confirmadas</h3>
        {loading ? (
          <div className="text-center text-gray-300">Cargando...</div>
        ) : reservas.length === 0 ? (
          <div className="text-center text-gray-400">No hay reservas confirmadas para esta fecha.</div>
        ) : (
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr>
                <th className="py-2">Cancha</th>
                <th className="py-2">Horario</th>
                <th className="py-2">Jugadores</th>
                <th className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map(reserva => (
                <tr key={reserva._id} className={selectedReserva?._id === reserva._id ? "bg-[#eaff00]/20" : ""}>
                  <td className="py-2">{reserva.cancha}</td>
                  <td className="py-2">{reserva.horario}</td>
                  <td className="py-2">{reserva.usuario_nombre}</td>
                  <td className="py-2">
                    <button
                      className="bg-[#eaff00] text-[#0D1B2A] px-3 py-1 rounded font-bold"
                      onClick={() => handleSelectReserva(reserva)}
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedReserva && (
        <div className="mt-6 w-full max-w-md bg-gray-900 rounded-lg p-6">
          <h4 className="text-lg font-bold text-[#eaff00] mb-2 text-center">
            {selectedReserva.resultado ? "Modificar resultado" : "Cargar resultado"} para la reserva
          </h4>
          <div className="mb-2 text-gray-200">
            <span className="font-semibold">Cancha:</span> {selectedReserva.cancha}<br />
            <span className="font-semibold">Horario:</span> {selectedReserva.horario}<br />
            <span className="font-semibold">Jugadores:</span> {selectedReserva.usuario_nombre}<br />
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
            onChange={e => setResultado(e.target.value)}
          />
          <button
            className="bg-[#eaff00] text-[#0D1B2A] px-4 py-2 rounded font-bold w-full"
            onClick={handleCargarResultado}
          >
            {selectedReserva.resultado ? "Modificar Resultado" : "Cargar Resultado"}
          </button>
        </div>
      )}
    </div>
  );
}

export default CargarResultados;