import React, { useState, useEffect } from 'react';
import backendClient from '../../../shared/services/backendClient';
import { toast } from 'react-toastify';
import Button from '../../../shared/components/ui/Button/Button';

// Props que recibirá el componente:
// - jugadorAReseñar: Objeto con los datos del jugador a calificar.
// - onReseñaEnviada: Función que se ejecuta cuando la reseña se envía con éxito.
// - onCancelar: Función para cerrar o cancelar la acción.

const FormularioReseña = ({ jugadorAReseñar, reservaId, onReseñaEnviada, onCancelar }) => {
  // Estados internos del formulario
  const [calificacion, setCalificacion] = useState("");
  const [observacion, setObservacion] = useState('');
  const [calificacionesDisponibles, setCalificacionesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carga las opciones de calificación (ej: 1, 2, 3 estrellas)
  useEffect(() => {
    const fetchCalificaciones = async () => {
      try {
        const data = await backendClient.get('users_b/resenias/calificaciones');
        setCalificacionesDisponibles(data.calificaciones || []);
      } catch (error) {
        toast.error("No se pudieron cargar las calificaciones.");
      }
    };
    fetchCalificaciones();
  }, []);

  // Maneja el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!calificacion || !observacion.trim()) {
      toast.warn("Debes seleccionar una calificación y escribir una observación.");
      return;
    }

    setLoading(true);
    try {
      await backendClient.post('users_b/resenias/crear', {
        con: jugadorAReseñar._id,
        calificacion,
        observacion,
        reserva_id: reservaId,
      });
      toast.success("Jugador calificado correctamente");
      if (onReseñaEnviada) onReseñaEnviada();
    } catch (error) {
      const msg = error?.data?.detail || error?.message || "Error al enviar la calificación";
      toast.error(msg);
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