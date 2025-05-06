import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AuthForm from '../components/common/AuthForm/AuthForm';

//frontend: npm run dev -- --host y para el backend: uvicorn main:app --reload --host 0.0.0.0 --port 8000

// esta es una linea nueva que uso para las ip y conectarse desde cualquier dispositivo
const BACKEND_URL = `http://${window.location.hostname}:8000`;

function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

  const campos = [
    {
      nombre: "username",
      etiqueta: "Nombre de usuario",
      tipo: "text",
      placeholder: "Nombre de usuario",
      autoComplete: "username",
    },
    {
      nombre: "password",
      etiqueta: "Contraseña",
      tipo: "password",
      placeholder: "Ingresa tu contraseña",
      autoComplete: "current-password",
    },
  ];

  const handleLogin = async (valores) => {
    setCargando(true);
    setErrores({});
    try {
      // antes iba: const response = await fetch('http://127.0.0.1:8000/users_b/login', {
      const response = await fetch(`${BACKEND_URL}/users_b/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(valores.username)}&password=${encodeURIComponent(valores.password)}`,
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
        setErrores({ general: errorData.detail || 'Credenciales incorrectas' });
      }
    } catch (error) {
      setErrores({ general: 'Error al enviar los datos' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <div className='mt-[4rem]'>
        <AuthForm
          titulo="Iniciar Sesión"
          campos={campos}
          onSubmit={handleLogin}
          textoBoton="Iniciar Sesión"
          cargando={cargando}
          errores={errores}
        >
          <p className="mt-4 text-center text-white">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-[#E5FF00] hover:underline">
              Regístrate
            </Link>
          </p>
        </AuthForm>
      </div>
    </div>
  );
}

export default Login;