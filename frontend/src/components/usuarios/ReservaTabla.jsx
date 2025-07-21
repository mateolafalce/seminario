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

function ReservaTabla() {
  const [selected, setSelected] = useState(null)
  const [cantidades, setCantidades] = useState({})
  const { isAuthenticated } = useContext(AuthContext)

  useEffect(() => {
    const fetchCantidades = async () => {
      try {
        const url = window.location.hostname === "localhost"
          ? `${BACKEND_URL}/api/reservas/cantidad`
          : "/api/reservas/cantidad";
        const res = await fetch(url)
        const data = await res.json()
        const mapa = {}
        for (const item of data) {
          const key = `${item.cancha}-${item.horario}`
          mapa[key] = item.cantidad
        }
        setCantidades(mapa)
      } catch (err) {
        console.error('Error al traer las cantidades:', err)
      }
    }

    fetchCantidades()
  }, [])

  const handleClick = async (cancha, hora) => {
    setSelected({ cancha, hora })
    const token = localStorage.getItem('accessToken')
    try {
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/reservas/reservar`
        : "/api/reservas/reservar";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cancha,
          horario: hora
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Error al reservar')
      }

      const data = await response.json()
      alert(`Reserva exitosa: ${data.msg}`)

      setCantidades(prev => {
        const key = `${cancha}-${hora}`
        return {
          ...prev,
          [key]: (prev[key] || 0) + 1
        }
      })

    } catch (err) {
      alert(`Error al reservar turno: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col items-center mt-8 min-h-[70vh] bg-[#101a2a] w-full py-6">
      <h2 className="text-xl font-bold text-white mb-6 text-center">Reservar Turno</h2>
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

                return (
                  <button
                    key={hora}
                    className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${isSelected ? 'bg-[#eaff00] text-[#0D1B2A]' : ''}
                      ${isFull ? 'bg-gray-500 text-gray-200 cursor-not-allowed' : ''}
                      ${!isSelected && !isFull ? 'bg-gray-700 text-[#eaff00] hover:bg-[#eaff00] hover:text-[#0D1B2A]' : ''}
                      focus:outline-none
                    `}
                    disabled={!isAuthenticated || isFull}
                    onClick={() => {
                      if (!isAuthenticated) {
                        alert('Debes iniciar sesión para reservar')
                      } else if (!isFull) {
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
