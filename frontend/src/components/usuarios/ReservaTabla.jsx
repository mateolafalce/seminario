import { useState, useContext, useEffect } from 'react'
import { AuthContext } from "../../context/AuthContext";

// esta es una linea nueva que se uso para las ip y conectarse con el movil o cualquier dispositivo en la red
const BACKEND_URL = `http://${window.location.hostname}:8000`;

const canchas = [
  'Blindex A',
  'Blindex B',
  'Blindex C',
  'Cemento Techada',
  'Cemento Sin Techar'
]

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
  const { isAuthenticated, apiFetch } = useContext(AuthContext); // Obtenemos apiFetch del contexto

  useEffect(() => {
    const fetchCantidades = async () => {
      try {
        // Usamos apiFetch y le pasamos los parámetros de búsqueda
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
        setCantidades({}); // Limpiar cantidades si hay error
      }
    }

    fetchCantidades();
  }, [selectedDate, apiFetch]); // Añadimos apiFetch a las dependencias

  const handleClick = async (cancha, hora) => {
    // Preguntar al usuario si está seguro
    if (!window.confirm(`¿Estás seguro de que quieres reservar en la cancha "${cancha}" a las ${hora} para el día ${selectedDate}?`)) {
      return; // Si el usuario cancela, no hacer nada
    }

    setSelected({ cancha, hora });
    try {
      // Usamos apiFetch para la petición POST
      const response = await apiFetch('/api/reservas/reservar', {
        method: 'POST',
        body: JSON.stringify({
          cancha,
          horario: hora,
          fecha: selectedDate // Enviar la fecha seleccionada
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al reservar');
      }

      const data = await response.json();
      alert(`Reserva exitosa: ${data.msg}`);

      setCantidades(prev => {
        const key = `${cancha}-${hora}`
        return {
          ...prev,
          [key]: (prev[key] || 0) + 1
        }
      })

    } catch (err) {
      alert(`Error al reservar turno: ${err.message}`)
      setSelected(null); // Limpiar la selección si hay un error
    }
  }

  return (
    <div className="flex flex-col items-center mt-8 min-h-[70vh] bg-[#101a2a] w-full py-6">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Reservar Turno</h2>
      
      <div className="mb-6 w-full max-w-xs">
        <label htmlFor="fecha-select" className="block text-sm font-medium text-gray-300 mb-2 text-center">Selecciona una fecha:</label>
        <select
          id="fecha-select"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelected(null); // Limpiar selección al cambiar de día
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
                const isFull = cantidad >= 4

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
                    onClick={() => {
                      if (!isAuthenticated) {
                        alert('Debes iniciar sesión para reservar')
                      } else if (!isFull && !isPast) {
                        handleClick(cancha, hora)
                      }
                    }}
                    style={{
                      minWidth: '4rem',
                      minHeight: '1.7rem',
                      marginBottom: '0.1rem'
                    }}
                  >
                    <span>{hora}</span>
                    <span className="block text-[0.7rem] font-bold">
                      {cantidad}/4 {isFull ? <span className="text-red-400">Lleno</span> : ''}
                      {isSelected && !isFull ? <span className="text-green-700 ml-1">¡Reservado!</span> : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-gray-400 text-xs text-center max-w-2xl">
        <span className="inline-block bg-[#eaff00]/70 text-[#0D1B2A] font-bold px-2 py-0.5 rounded-full mr-2">Tip</span>
        Haz clic en un horario para reservar. Si el botón está gris, ese horario está lleno.
      </div>
    </div>
  )
}

export default ReservaTabla
