import { useState } from 'react'

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

  const handleClick = async (cancha, hora) => {
    setSelected({ cancha, hora })

    try {
      const response = await fetch('/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancha, hora })
      })

      const data = await response.text()
      alert(`Reserva exitosa: ${data}`)
    } catch (err) {
      alert('Error al reservar turno')
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
                    cursor: 'pointer',
                    backgroundColor: selected?.cancha === cancha && selected?.hora === hora ? '#a0e0a0' : '#f9f9f9',
                    border: '1px solid #ccc',
                    padding: '10px',
                    textAlign: 'center'
                  }}
                  onClick={() => handleClick(cancha, hora)}
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
