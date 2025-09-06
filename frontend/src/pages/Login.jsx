import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AuthForm from '../components/common/AuthForm/AuthForm';

const BACKEND_URL = `http://${window.location.hostname}:8000`;

function Login() {
  const navigate = useNavigate();
  const { login, redirectAfterLogin, setRedirectAfterLogin, isAuthenticated } = useContext(AuthContext);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated) {
      if (redirectAfterLogin) {
        navigate(redirectAfterLogin, { replace: true });
        setRedirectAfterLogin(null);
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [isAuthenticated, navigate, redirectAfterLogin, setRedirectAfterLogin]);

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
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/users_b/login`
        : "/api/users_b/login";
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(valores.username)}&password=${encodeURIComponent(valores.password)}`,
      });

      if (response.ok) {
        const data = await response.json();
        handleLoginSuccess(data.access_token, data.is_admin, data.is_empleado, data.habilitado);
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

  const handleLoginSuccess = (token, isAdmin, isEmpleado, habilitado) => {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = {
      id: payload.id
    };

    login(token, isAdmin, isEmpleado, habilitado, userData);
    // La redirección ahora se maneja en el useEffect
  };

  
  if (isAuthenticated) {
    return null; // o un spinner de carga
  }

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
