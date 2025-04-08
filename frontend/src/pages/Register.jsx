import { useState } from 'react'

function Register() {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== repeatPassword) {
      alert('Las contraseñas no coinciden')
      return
    }

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellido,
          email,
          password
        })
      })

      const result = await response.text()
      alert(result)
    } catch (error) {
      alert('Error registrando usuario')
    }
  }

  return (
    <div>
      <h2>Crear Usuario</h2>
      <form onSubmit={handleSubmit}>
        <label>Nombre:</label>
        <input
          type="text"
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <br />

        <label>Apellido:</label>
        <input
          type="text"
          name="apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          required
        />
        <br />

        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />

        <label>Contraseña:</label>
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />

        <label>Repetir Contraseña:</label>
        <input
          type="password"
          name="repeatPassword"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
        />
        <br />

        <button type="submit">Crear Usuario</button>
      </form>
    </div>
  )
}

export default Register
