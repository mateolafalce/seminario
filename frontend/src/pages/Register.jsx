import { useState } from 'react'

function Register() {
  const [email, setEmail] = useState('ferris@crab.domain')
  const [password, setPassword] = useState('ferris')

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          password: password
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

        <button type="submit">Crear Usuario</button>
      </form>
    </div>
  )
}

export default Register
