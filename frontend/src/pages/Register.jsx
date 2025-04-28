import React, { useContext, useState } from 'react';
import {AuthContext} from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button/Button';

function Register() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); 
  const navigate = useNavigate();
  const {loginWithToken} = useContext(AuthContext);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleRepeatPasswordVisibility = () => {
    setShowRepeatPassword(!showRepeatPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); 

    if (password !== repeatPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/users_b/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellido,
          email,
          password,
          username,
        }),
      });
      if(response.ok) {
        const data = await response.json();
        loginWithToken(data.accessToken);
        navigate('/login');
      } else {
        try {
          const errorData = await response.json();
          setErrorMessage(errorData.detail || 'Error al registrar usuario');
        } catch (error) {
          setErrorMessage('Error al procesar la respuesta de error');
          console.error("Error al parsear la respuesta de error:", error);
        }
      }
      const result = await response.text()
      alert(result)
    } catch (error) {
      setErrorMessage('Error de conexión con el servidor');
      console.error("Error de fetch:", error);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center ">
        <div className="col-md-6 col-lg-5" >
          <div className="card shadow-sm p-4">
            <h2 className="text-center mb-4">Crear Usuario</h2>
            {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
            <form onSubmit={handleSubmit} className="register-form ">
              <div className="mb-3">
                <label htmlFor="nombre" className="form-label">Nombre:</label>
                <input type="text" className="form-control" id="nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label htmlFor="apellido" className="form-label">Apellido:</label>
                <input type="text" className="form-control" id="apellido" name="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email:</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope-fill"></i></span>
                  <input type="email" className="form-control" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="username" className="form-label">Nombre de usuario:</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-person-fill"></i></span>
                  <input type="text" className="form-control" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Contraseña:</label>
                <div className="input-group">
                  <input type={showPassword ? 'text' : 'password'} className="form-control" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button className="btn btn-outline-secondary" type="button" onClick={togglePasswordVisibility}>
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="repeatPassword" className="form-label">Repetir Contraseña:</label>
                <div className="input-group">
                  <input type={showRepeatPassword ? 'text' : 'password'} className="form-control" id="repeatPassword" name="repeatPassword" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} required />
                  <button className="btn btn-outline-secondary" type="button" onClick={toggleRepeatPasswordVisibility}>
                    <i className={`bi ${showRepeatPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>
              <div className="d-grid">
                <Button
                  texto="Crear Usuario"
                  type="submit"
                  className="btn btn-primary btn-lg"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;