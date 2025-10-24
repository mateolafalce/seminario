import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AuthForm from '../components/common/AuthForm/AuthForm';

function Login() {
  const navigate = useNavigate();
  const { login, redirectAfterLogin, setRedirectAfterLogin, isAuthenticated } = useContext(AuthContext);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

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
    { nombre: "username", etiqueta: "Nombre de usuario", tipo: "text", placeholder: "Nombre de usuario", autoComplete: "username" },
    { nombre: "password", etiqueta: "Contraseña", tipo: "password", placeholder: "Ingresa tu contraseña", autoComplete: "current-password" },
  ];

  const handleLogin = async (valores) => {
    setCargando(true);
    setErrores({});
    try {
      await login(valores.username, valores.password);
      // la redirección la maneja el efecto por isAuthenticated
    } catch (error) {
      setErrores({ general: error.message || 'Credenciales incorrectas' });
    } finally {
      setCargando(false);
    }
  };

  if (isAuthenticated) return null;

  return (
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
  );
}

export default Login;
