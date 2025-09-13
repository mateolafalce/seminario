// src/components/common/FormularioReseña.js

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Button from '../common/Button/Button'; // ← ¡Ruta corregida!

// Props que recibirá el componente:
// - jugadorAReseñar: Objeto con los datos del jugador a calificar.
// - onReseñaEnviada: Función que se ejecuta cuando la reseña se envía con éxito.
// - onCancelar: Función para cerrar o cancelar la acción.

const FormularioReseña = ({ jugadorAReseñar, reservaId, onReseñaEnviada, onCancelar }) => {
  const { apiFetch } = useContext(AuthContext);

  // Estados internos del formulario
  const [calificacion, setCalificacion] = useState("");
  const [observacion, setObservacion] = useState('');
  const [calificacionesDisponibles, setCalificacionesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carga las opciones de calificación (ej: 1, 2, 3 estrellas)
  useEffect(() => {
    const fetchCalificaciones = async () => {
      try {
        const response = await apiFetch("/api/users_b/calificaciones");
        if (response.ok) {
          const data = await response.json();
          setCalificacionesDisponibles(data.calificaciones || []);
        } else {
          toast.error("No se pudieron cargar las calificaciones.");
        }
      } catch (error) {
        console.error("Error al cargar calificaciones:", error);
      }
    };
    fetchCalificaciones();
  }, [apiFetch]);

  // Maneja el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!calificacion || !observacion.trim()) {
      toast.warn("Debes seleccionar una calificación y escribir una observación.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/users_b/reseñar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          con: jugadorAReseñar._id, // Usamos el ID del jugador recibido por props
          calificacion: calificacion,
          observacion: observacion,
          reserva_id: reservaId, // <-- importante
        }),
      });

      if (response.ok) {
        toast.success("Jugador calificado correctamente");
        if (onReseñaEnviada) {
          onReseñaEnviada(); // Llama a la función del padre para notificar el éxito
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || "Error al enviar la calificación");
      }
    } catch (error) {
      toast.error("Error de conexión al enviar la calificación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <h3 className="text-2xl font-bold text-[#eaff00] mb-4 text-center">Calificar Jugador</h3>
      <p className="text-gray-300 mb-6 text-center">
        Estás calificando a: <span className="font-bold text-white">{jugadorAReseñar.nombre} {jugadorAReseñar.apellido}</span>
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Calificación</label>
          <select
            value={calificacion}
            onChange={(e) => setCalificacion(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
            required
          >
            <option value="">Selecciona una calificación</option>
            {calificacionesDisponibles.map(c => (
              <option key={c._id} value={c._id}>
                {c.numero}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-300 mb-2">Observaciones</label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
            rows="3"
            placeholder="Añade comentarios sobre el jugador..."
            required
          />
        </div>

        <div className="flex gap-4">
          <Button
            texto="Cancelar"
            onClick={onCancelar} // Llama a la función de cancelar del padre
            variant="cancelar"
            className="flex-1"
            type="button"
          />
          <Button
            texto={loading ? 'Enviando...' : 'Enviar Calificación'}
            type="submit"
            variant="default"
            className="flex-1"
            disabled={loading}
          />
        </div>
      </form>
    </div>
  );
};

export default FormularioReseña;