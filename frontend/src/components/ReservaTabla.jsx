import { useState, useContext, useEffect } from 'react'
import { AuthContext } from '../components/AuthContext'

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

  // Obtener cantidades de reservas
  useEffect(() => {
    const fetchCantidades = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/reservas/cantidad')
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
      const response = await fetch('http://127.0.0.1:8000/reservas/reservar', {
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

      // Actualizar cantidades después de reservar
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
    <div>
      <h2>Elige tu turno</h2>
      <table>
        <thead>
          <tr>
            <th>Cancha</th>
            {horarios.map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {canchas.map(cancha => (
            <tr key={cancha}>
              <td>{cancha}</td>
              {horarios.map(hora => {
                const key = `${cancha}-${hora}`
                const cantidad = cantidades[key] || 0

                return (
                  <td
                    key={hora}
                    style={{
                      cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                      backgroundColor: selected?.cancha === cancha && selected?.hora === hora ? '#a0e0a0' : '#f9f9f9',
                      border: '1px solid #ccc',
                      padding: '10px',
                      textAlign: 'center'
                    }}
                    onClick={() => {
                      if (isAuthenticated) {
                        handleClick(cancha, hora)
                      } else {
                        alert('Debes iniciar sesión para reservar')
                      }
                    }}
                  >
                    <div>{cantidad}/4</div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReservaTabla
