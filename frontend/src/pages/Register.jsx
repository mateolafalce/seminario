import { useState } from 'react'
import '../styles/Register.css'

function Register() {
  const [id, setId] = useState('')
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
      const response = await fetch('http://127.0.0.1:8000/users_b/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
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
        <input
          type="text"
          name="nombre"
          value={nombre}
          placeholder="Nombre"
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <br />

        <input
          type="apellido"
          name="apellido"
          value={apellido}
          placeholder="Apellido"
          onChange={(e) => setApellido(e.target.value)}
          required
        />
        <br />

        <input
          type="email"
          name="email"
          value={email}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />

        <input
          type="password"
          name="password"
          value={password}
          placeholder="Contraseña"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />

        <input
          type="password"
          name="repeatPassword"
          value={repeatPassword}
          placeholder="Repetir Contraseña"
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
        />
        <br />

        <button className="submit" type="submit">Crear Usuario</button>
      </form>
    </div>
  )
}

export default Register
