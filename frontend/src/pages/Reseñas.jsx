import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";

const Reseñas = () => {
  const { apiFetch } = useContext(AuthContext);
  const [jugadores, setJugadores] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [con, setCon] = useState("");
  const [calificacion, setCalificacion] = useState("");
  const [observacion, setObservacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // Obtener jugadores con los que jugó el usuario
  useEffect(() => {
    const fetchJugadores = async () => {
      const response = await apiFetch("/api/users_b/jugadores_con_quienes_jugo", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setJugadores(data.jugadores || []);
      } else {
        setJugadores([]);
      }
    };
    fetchJugadores();
  }, [apiFetch]);

  // Obtener calificaciones
  useEffect(() => {
    const fetchCalificaciones = async () => {
      const response = await apiFetch("/api/users_b/calificaciones", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCalificaciones(data.calificaciones || []);
      } else {
        setCalificaciones([]);
      }
    };
    fetchCalificaciones();
  }, [apiFetch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");
    const response = await apiFetch("/api/users_b/reseñar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ con, calificacion, observacion })
    });
    if (response.ok) {
      setMensaje("Reseña creada correctamente.");
      setCon("");
      setCalificacion("");
      setObservacion("");
      toast.success("Reseña creada correctamente.");
    } else {
      const err = await response.json();
      setError(err.detail || "Error al crear la reseña.");
      toast.error(err.detail || "Error al crear la reseña.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-gray-900 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-[#eaff00] mb-4 text-center">Dejar una reseña</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Jugador:</label>
          <select value={con} onChange={e => setCon(e.target.value)} required className="w-full p-2 rounded bg-gray-800 text-white">
            <option value="">Selecciona un jugador</option>
            {jugadores.map(j => (
              <option key={j.id} value={j.id}>
                {j.nombre} {j.apellido} ({j.username})
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Calificación:</label>
          <select value={calificacion} onChange={e => setCalificacion(e.target.value)} required className="w-full p-2 rounded bg-gray-800 text-white">
            <option value="">Selecciona una calificación</option>
            {calificaciones.map(c => (
              <option key={c._id} value={c._id}>
                {c.numero}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Observación:</label>
          <textarea
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        </div>
        <button type="submit" className="bg-[#eaff00] text-[#0D1B2A] px-4 py-1 rounded font-bold">Enviar reseña</button>
      </form>
    </div>
  );
};

export default Reseñas;