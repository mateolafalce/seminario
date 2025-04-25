import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';


function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('')
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
        login(data.access_token, data.is_admin, data.habilitado);

        if (data.is_admin === true) {
          navigate('/admin');
        } else {
          navigate('/reserva');
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
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm p-4 login-container">
            <h2 className="text-center mb-4">Iniciar Sesión</h2>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="mb-3">
                <label htmlFor="username" className="form-label">Nombre de usuario:</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-person-fill"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={username}
                    placeholder="Nombre de usuario"
                    required
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">Contraseña:</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock-fill"></i></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    id="password"
                    value={password}
                    placeholder="Ingresa tu contraseña"
                    required
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={togglePasswordVisibility}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              <div className="d-grid">
                <button type="submit" className="btn btn-primary btn-lg">Iniciar Sesión</button>
              </div>
            </form>
            <p className="mt-3 text-center login-register-link">
              ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;