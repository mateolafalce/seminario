import { useState, useContext, useEffect } from 'react'
import { AuthContext } from "../../context/AuthContext";
import { toast } from 'react-toastify';
import MiToast from '../common/Toast/MiToast';
import { useLocation } from 'react-router-dom';

export const generarHorarios = () => {
  const horarios = []
  let hora = 9
  let minuto = 0

  while (hora < 23) {
    const inicioH = hora.toString().padStart(2, '0')
    const inicioM = minuto.toString().padStart(2, '0')

    let finH = hora
    let finM = minuto + 30
    if (finM >= 60) {
      finM -= 60
      finH += 1
    }
    finH += 1

    if (finH >= 24) break

    const finHora = finH.toString().padStart(2, '0')
    const finMin = finM.toString().padStart(2, '0')

    horarios.push(`${inicioH}:${inicioM}-${finHora}:${finMin}`)

    minuto += 30
    if (minuto >= 60) {
      minuto = 0
      hora += 1
    }
    hora += 1
  }

  return horarios
}

const horarios = generarHorarios()

// --- Helper para generar las fechas ---
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

const fechasDisponibles = generarFechas();

function ReservaTabla() {
  const [selected, setSelected] = useState(null)
  const [cantidades, setCantidades] = useState({})
  const [selectedDate, setSelectedDate] = useState(fechasDisponibles[0].value);
  const [canchas, setCanchas] = useState([]);
  const [detalleReserva, setDetalleReserva] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const { isAuthenticated, apiFetch, user } = useContext(AuthContext);
  const location = useLocation();
  const [urlParams, setUrlParams] = useState(null);

  // Obtener canchas desde la API
  useEffect(() => {
    const fetchCanchas = async () => {
      try {
        const response = await apiFetch('/api/canchas/listar');
        if (response.ok) {
          const data = await response.json();
          setCanchas(data.map(c => c.nombre));
        } else {
          setCanchas([]);
        }
      } catch (err) {
        setCanchas([]);
      }
    };
    fetchCanchas();
  }, [apiFetch]);

  useEffect(() => {
    const fetchCantidades = async () => {
      try {
        const response = await apiFetch(`/api/reservas/cantidad?fecha=${selectedDate}`);
        if (response.ok) {
          const data = await response.json();
          const mapa = {};
          for (const item of data) {
            const key = `${item.cancha}-${item.horario}`;
            mapa[key] = item.cantidad;
          }
          setCantidades(mapa);
        } else {
          setCantidades({});
        }
      } catch (err) {
        if (err.message !== 'Sesión expirada') {
          console.error('Error al traer las cantidades:', err);
        }
        setCantidades({});
      }
    }

    fetchCantidades();
  }, [selectedDate, apiFetch]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fecha = params.get('fecha');
    const cancha = params.get('cancha');
    const horario = params.get('horario');
    if (fecha && cancha && horario) {
      setSelectedDate(fecha);
      setUrlParams({ cancha, horario, fecha });
    } else {
      setUrlParams(null);
    }
  }, [location.search]);

  useEffect(() => {
    // Espera a que selectedDate y user estén listos
    if (
      urlParams &&
      selectedDate === urlParams.fecha &&
      user?.id
    ) {
      abrirDetalleReserva(urlParams.cancha, urlParams.horario);
      setUrlParams(null); // Evita abrir dos veces
    }
  }, [selectedDate, urlParams, user]);

  const handleClick = async (cancha, hora) => {
    if (!window.confirm(`¿Estás seguro de que quieres reservar en la cancha "${cancha}" a las ${hora} para el día ${selectedDate}?`)) {
      return;
    }

    setSelected({ cancha, hora });
    try {
      const response = await apiFetch('/api/reservas/reservar', {
        method: 'POST',
        body: JSON.stringify({
          cancha,
          horario: hora,
          fecha: selectedDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al reservar');
      }

      const data = await response.json();
      
      toast(
        <MiToast 
          mensaje={`Reserva exitosa: ${data.msg}`} 
          color="var(--color-green-400)" 
        />
      );

      setCantidades(prev => {
        const key = `${cancha}-${hora}`
        return {
          ...prev,
          [key]: (prev[key] || 0) + 1
        }
      })

    } catch (err) {
      toast(
        <MiToast 
          mensaje={`Error al reservar turno: ${err.message}`} 
          color="var(--color-red-400)" 
        />
      );

      setSelected(null);
    }
  }

  const normalizarTexto = (texto) => texto.trim().replace(/\s+/g, ' ');

  const abrirDetalleReserva = async (cancha, hora) => {
    setLoadingDetalle(true)
    setModalOpen(true)
    try {
      // Normaliza los parámetros antes de la petición
      const canchaNorm = normalizarTexto(cancha);
      const horaNorm = normalizarTexto(hora);
      const url = `/api/reservas/detalle?cancha=${encodeURIComponent(canchaNorm)}&horario=${encodeURIComponent(horaNorm)}&fecha=${encodeURIComponent(selectedDate)}${user?.id ? `&usuario_id=${user.id}` : ''}`
      const response = await apiFetch(url)
      if (response.ok) {
        const data = await response.json()
        setDetalleReserva(data)
      } else {
        setDetalleReserva(null)
      }
    } catch (e) {
      setDetalleReserva(null)
    }
    setLoadingDetalle(false)
  }

  return (
    <div className="flex flex-col items-center mt-8 min-h-[70vh] w-full py-6">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Reservar Turno</h2>
      
      <div className="mb-6 w-full max-w-xs">
        <label htmlFor="fecha-select" className="block text-sm font-medium text-gray-300 mb-2 text-center">Selecciona una fecha:</label>
        <select
          id="fecha-select"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelected(null);
          }}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-[#eaff00] focus:border-[#eaff00] block w-full p-2.5"
        >
          {fechasDisponibles.map(fecha => (
            <option key={fecha.value} value={fecha.value}>{fecha.display}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-5xl">
        {canchas.map((cancha) => (
          <div
            key={cancha}
            className="bg-gray-800 rounded-xl flex flex-col items-center p-4"
          >
            <h3 className="text-base font-semibold text-[#eaff00] mb-3 text-center">{cancha}</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {horarios.map((hora) => {
                const key = `${cancha}-${hora}`
                const cantidad = cantidades[key] || 0
                const isSelected = selected?.cancha === cancha && selected?.hora === hora
                const isFull = cantidad >= 6

                // --- Lógica para deshabilitar horarios pasados ---
                let isPast = false;
                const hoyValue = fechasDisponibles[0].value;
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
                // --- Fin de la lógica ---

                return (
                  <button
                    key={hora}
                    className={`
                      px-2 py-1 rounded-full text-xs font-medium transition-colors
                      ${isSelected ? 'bg-[#eaff00] text-[#0D1B2A]' : ''}
                      ${isFull || isPast ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : ''}
                      ${!isSelected && !isFull && !isPast ? 'bg-gray-700 text-[#eaff00] hover:bg-[#eaff00] hover:text-[#0D1B2A]' : ''}
                      focus:outline-none
                    `}
                    disabled={!isAuthenticated || isFull || isPast}
                    onClick={() => abrirDetalleReserva(cancha, hora)}
                    style={{
                      minWidth: '4rem',
                      minHeight: '1.7rem',
                      marginBottom: '0.1rem'
                    }}
                  >
                    <span>{hora}</span>
                    <span className="block text-[0.7rem] font-bold">
                      {cantidad}/6 {isFull ? <span className="text-red-400">Lleno</span> : ''}
                      {isSelected && !isFull ? <span className="text-green-700 ml-1">¡Reservado!</span> : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de detalles */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
              onClick={() => setModalOpen(false)}
            >✕</button>
            {loadingDetalle ? (
              <div className="text-center text-gray-300">Cargando...</div>
            ) : detalleReserva ? (
              <div>
                <h3 className="text-lg font-bold text-[#eaff00] mb-2 text-center">Detalle de Reserva</h3>
                <div className="mb-2 text-gray-200">
                  <span className="font-semibold">Cancha:</span> {detalleReserva.cancha}<br/>
                  <span className="font-semibold">Fecha:</span> {detalleReserva.fecha}<br/>
                  <span className="font-semibold">Horario:</span> {detalleReserva.horario}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-200">Reservaron:</span>
                  <ul className="mt-1">
                    {detalleReserva.usuarios.length === 0 ? (
                      <li className="text-gray-400">Nadie aún</li>
                    ) : detalleReserva.usuarios
                        .filter(u => u.estado !== detalleReserva.estado_cancelada) // Excluir canceladas
                        .map((u, idx) => (
                          <li key={idx} className="text-gray-300">{u.nombre} {u.apellido}</li>
                        ))}
                  </ul>
                </div>
                <div className="flex gap-2 mt-4">
                  {(() => {
                    const key = `${detalleReserva.cancha}-${detalleReserva.horario}`;
                    const cantidad = cantidades[key] || detalleReserva.usuarios.filter(u => u.estado !== detalleReserva.estado_cancelada).length || 0;
                    const isFull = cantidad >= 4;
                    const usuarioReserva = detalleReserva.usuarios.find(
                      u => u.usuario_id === user?.id
                    );
                    const estadoCancelada = usuarioReserva?.estado === detalleReserva.estado_cancelada;

                    if (usuarioReserva && !estadoCancelada) {
                      return (
                        <button
                          key={usuarioReserva.reserva_id}
                          className="bg-red-500 text-white px-4 py-1 rounded font-bold"
                          onClick={async () => {
                            try {
                              const response = await apiFetch(`/api/reservas/cancelar/${usuarioReserva.reserva_id}`, { method: 'DELETE' })
                              if (response.ok) {
                                toast(<MiToast mensaje="Reserva cancelada" color="var(--color-red-400)" />)
                                setModalOpen(false)
                              } else {
                                const error = await response.json()
                                toast(<MiToast mensaje={error.detail || "Error al cancelar"} color="var(--color-red-400)" />)
                              }
                            } catch (err) {
                              toast(<MiToast mensaje="Error al cancelar" color="var(--color-red-400)" />)
                            }
                          }}
                        >Cancelar</button>
                      );
                    }
                    // Si el usuario tiene reserva cancelada, muestra el botón reservar
                    if (usuarioReserva && estadoCancelada && isAuthenticated) {
                      return (
                        <button
                          className="bg-[#eaff00] text-[#0D1B2A] px-4 py-1 rounded font-bold"
                          onClick={() => {
                            setModalOpen(false)
                            handleClick(detalleReserva.cancha, detalleReserva.horario)
                          }}
                        >Reservar</button>
                      );
                    }
                    // Si el usuario no tiene reserva, muestra el botón reservar si hay lugar
                    if (!usuarioReserva && !isFull && isAuthenticated) {
                      return (
                        <button
                          className="bg-[#eaff00] text-[#0D1B2A] px-4 py-1 rounded font-bold"
                          onClick={() => {
                            setModalOpen(false)
                            handleClick(detalleReserva.cancha, detalleReserva.horario)
                          }}
                        >Reservar</button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center text-red-400">No se pudo cargar el detalle</div>
            )}
          </div>
        </div>
      )}
      <div className="mt-6 text-gray-400 text-xs text-center max-w-2xl">
        <span className="inline-block bg-[#eaff00]/70 text-[#0D1B2A] font-bold px-2 py-0.5 rounded-full mr-2">Tip</span>
        Haz clic en un horario para reservar. Si el botón está gris, ese horario está lleno.
      </div>
    </div>
  )
}

export default ReservaTabla
