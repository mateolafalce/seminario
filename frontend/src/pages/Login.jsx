import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../components/AuthContext'
import Botones from '../components/Boton'
import '../components/login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const {login} = useContext(AuthContext)

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('http://127.0.0.1:8000/users_b/login', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      });

      if (response.ok) {
        const data = await response.json();
        login(data.access_token, data.is_admin)
        
        if(data.is_admin == true){
          navigate('/admin')
        }else{
          navigate('/HomePage')
        }

      } else {
        const errorData = await response.json();
        alert(`Error al iniciar sesión: ${errorData.detail || 'Credenciales incorrectas'}`);
      }
    } catch (error) {
      alert('Error al enviar los datos');
      console.error(error);
    }
  };

  return (
    <div className="login-container">
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="username">Nombre de usuario:</label> 
          <input
            type="text"
            id="username"
            value={username}
            placeholder="Nombre de usuario"
            required
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            placeholder="Ingresa tu contraseña"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Botones type="submit" texto="Iniciar Sesión" />
      </form>
      <p className="login-register-link">
        ¿No tienes cuenta? <a href="/register">Regístrate</a>
      </p>
    </div>
  );
}

export default Login
