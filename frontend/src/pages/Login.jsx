import { useState } from 'react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })

      const result = await response.text()
      alert(result)
    } catch (error) {
      alert('Error al enviar los datos')
      console.error(error)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Index</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          placeholder="Email"
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          value={password}
          placeholder="Contraseña"
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button className="submit" type="submit">Submit</button>
      </form>
    </div>
  )
}

export default Login
