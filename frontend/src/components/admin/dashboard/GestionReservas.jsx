import { useState, useEffect, useContext } from 'react'
import { AuthContext } from "../../../context/AuthContext";
import { toast } from 'react-toastify';
import MiToast from '../../common/Toast/MiToast';
import backendClient from '../../../services/backendClient'; // 👈 usa el cliente nuevo

// Genera fechas próximas 7 días
const generarFechas = () => {
  const fechas = [];
  const hoy = new Date();
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    const value = `${String(fecha.getDate()).padStart(2, '0')}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${fecha.getFullYear()}`;
    fechas.push(value);
  }
  return fechas;
};

export default function GestionReservas() {
  // ya no necesitamos apiFetch ni token
  const { user } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(generarFechas()[0]);
  const [canchas, setCanchas] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cantidades, setCantidades] = useState([]);

  // Traer canchas y horarios
  useEffect(() => {
    (async () => {
      try {
        const canchasResp = await backendClient.get('canchas/listar');
        setCanchas((canchasResp || []).map(c => c.nombre));

        const horariosResp = await backendClient.get('horarios/listar');
        const horariosOrdenados = (horariosResp || [])
          .map(h => h.hora)
          .sort((a, b) => {
            const getInicio = h => {
              const [hora, min] = h.split('-')[0].split(':');
              return parseInt(hora) + parseInt(min) / 60;
            };
            return getInicio(a) - getInicio(b);
          });
        setHorarios(horariosOrdenados);
      } catch (e) {
        toast(<MiToast mensaje={e.message || 'Error cargando datos'} color="#ef4444" />);
      }
    })();
  }, []);

  // Cargar cantidades de reservas al cambiar la fecha seleccionada
  useEffect(() => {
    (async () => {
      if (!selectedDate) return;
      try {
        const data = await backendClient.get('reservas/cantidad', { fecha: selectedDate });
        setCantidades(data || []);
      } catch (e) {
        toast(<MiToast mensaje={e.message || 'Error cargando cantidades'} color="#ef4444" />);
      }
    })();
  }, [selectedDate]);

  // Modal detalle de reserva
  const abrirDetalle = async (cancha, horario) => {
    try {
      const data = await backendClient.get('reservas/detalle', {
        cancha,
        horario,
        fecha: selectedDate,
      });
      setDetalle(data);
      setModalOpen(true);
    } catch (e) {
      toast(<MiToast mensaje={e.message || 'Error cargando detalle'} color="#ef4444" />);
    }
  };

  // Eliminar (usa cookie + CSRF, no hace falta Authorization)
  const eliminarReservaUsuario = async (reservaId) => {
    if (!window.confirm("¿Eliminar esta reserva?")) return;
    try {
      await backendClient.delete(`reservas/cancelar/${reservaId}`);
      toast(<MiToast mensaje="Reserva eliminada" color="#ef4444" />);
      setModalOpen(false);
      const data = await backendClient.get('reservas/cantidad', { fecha: selectedDate });
      setCantidades(data || []);
    } catch (e) {
      toast(<MiToast mensaje={e.message || 'Error'} color="#ef4444" />);
    }
  };

  return (
    <div className="flex flex-col items-center mt-4 min-h-[60vh] bg-[#101a2a] w-full py-4">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Gestión de Reservas</h2>
      <div className="mb-4 w-full max-w-xs">
        <label className="block text-sm font-medium text-gray-300 mb-2 text-center">Selecciona una fecha:</label>
        <select
          value={selectedDate || generarFechas()[0]}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
        >
          {generarFechas().map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-5xl">
        {canchas.map(cancha => (
          <div key={cancha} className="bg-gray-800 rounded-xl flex flex-col items-center p-4">
            <h3 className="text-base font-semibold text-[#eaff00] mb-3 text-center">{cancha}</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {horarios.map(hora => {
                // Busca la cantidad para esta cancha y horario
                const cantidadObj = cantidades.find(
                  c => c.cancha === cancha && c.horario === hora
                );
                const cantidad = cantidadObj ? cantidadObj.cantidad : 0;
                // --- Lógica para deshabilitar horarios pasados ---
                let isPast = false;
                const hoyValue = generarFechas()[0];
                if (selectedDate === hoyValue) {
                  const ahora = new Date();
                  const [horaInicio, minutoInicio] = hora.split('-')[0].split(':');
                  const horaTurno = new Date();
                  horaTurno.setHours(parseInt(horaInicio), parseInt(minutoInicio), 0, 0);
                  // Es pasado si el turno es anterior a la hora actual + 1 hora
                  if ((horaTurno.getTime() - ahora.getTime()) < 3600000) { // 3600000ms = 1 hora
                    isPast = true;
                  }
                }

                return (
                  <button
                    key={hora}
                    className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${isPast ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-700 text-[#eaff00] hover:bg-[#eaff00] hover:text-[#0D1B2A]'}
                    `}
                    disabled={isPast}
                    onClick={() => !isPast && abrirDetalle(cancha, hora)}
                  >
                    {hora}
                    <span className="block text-[0.7rem] font-bold">
                      {cantidad}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Modal detalle */}
      {modalOpen && detalle && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
              onClick={() => setModalOpen(false)}
            >✕</button>
            <h3 className="text-lg font-bold text-[#eaff00] mb-2 text-center">Detalle de Reserva</h3>
            <div className="mb-2 text-gray-200">
              <span className="font-semibold">Cancha:</span> {detalle.cancha}<br />
              <span className="font-semibold">Fecha:</span> {detalle.fecha}<br />
              <span className="font-semibold">Horario:</span> {detalle.horario}
            </div>
            <div className="mb-2">
              <span className="font-semibold text-gray-200">Usuarios con reserva activa:</span>
              <ul className="mt-1">
                {detalle.usuarios.length === 0 ? (
                  <li className="text-gray-400">Nadie aún</li>
                ) : detalle.usuarios.map((u, idx) => (
                  <li key={idx} className="flex items-center justify-between text-gray-300">
                    <span>{u.nombre} {u.apellido}</span>
                    <button
                      className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs"
                      onClick={() => eliminarReservaUsuario(u.reserva_id)}
                    >Eliminar</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}