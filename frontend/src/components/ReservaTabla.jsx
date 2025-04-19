import { useState, useContext } from 'react'
import { AuthContext } from '../components/AuthContext'

const canchas = [
  'Blindex A',
  'Blindex B',
  'Blindex C',
  'Cemento Techada',
  'Cemento Sin Techar'
]

const generarHorarios = () => {
  const horarios = []
  let hora = 9
  let minuto = 0

  while (hora < 23) {
    const inicioH = hora.toString().padStart(2, '0')
    const inicioM = minuto.toString().padStart(2, '0')

    // calcular hora de fin (sumar 1h30)
    let finH = hora
    let finM = minuto + 30
    if (finM >= 60) {
      finM -= 60
      finH += 1
    }
    finH += 1

    if (finH >= 24) break // no pasar de las 23:00

    const finHora = finH.toString().padStart(2, '0')
    const finMin = finM.toString().padStart(2, '0')

    horarios.push(`${inicioH}:${inicioM} - ${finHora}:${finMin}`)

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
  const { isAuthenticated } = useContext(AuthContext)

  const handleClick = async (cancha, hora) => {
    setSelected({ cancha, hora })
    const token = localStorage.getItem('accessToken');
    // Enviar token JWT al backend y que valide que sea un usuario legitimo
    try {
      const response = await fetch('http://127.0.0.1:8000/reservas/reservar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cancha,
          horario: hora.split(' - ')[0]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Error al reservar')
      }

      const data = await response.json()
      alert(`Reserva exitosa: ${data.msg}`)
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
              {horarios.map(hora => (
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
                  Reservar
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReservaTabla
