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

  // Mapea errores de la API a mensajes amigables
  const normalizeApiError = async (error) => {
    // Si viene envuelto como NETWORK_ERROR o sin status → problema real de red
    if (!error || (!('status' in error) && error?.message === 'NETWORK_ERROR')) {
      return { general: "No se pudo conectar con el servidor. Verificá tu conexión o intentá de nuevo." };
    }
    const status = error.status;
    const data = error.data;
    const detail = data?.detail ?? data;
    if (status === 422) { // vacíos
      if (typeof detail === "string") {
        // Mostramos como general; opcional: repartir a campos si querés
        return { general: detail };
      }
    }
    if (status === 404) return { username: "El usuario no existe" };
    if (status === 400) return { password: "Contraseña incorrecta" };
    if (status === 403) return { general: typeof detail === "string" ? detail : "Tu cuenta no está habilitada" };
    if (typeof detail === "string") return { general: detail };
    return { general: "Ocurrió un error inesperado" };
  };

  const handleLogin = async (valores) => {
    setCargando(true);
    setErrores({});
    try {
      // Validación previa en el cliente para UX clara
      const errs = {};
      if (!valores.username?.trim()) errs.username = "Ingresá el usuario";
      if (!valores.password?.trim()) errs.password = "Ingresá la contraseña";
      if (Object.keys(errs).length) {
        setErrores(errs);
        setCargando(false);
        return;
      }

      await login(valores.username, valores.password);
      // la redirección la maneja el efecto por isAuthenticated
    } catch (error) {
      const mapped = await normalizeApiError(error);
      setErrores(mapped);
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
            Regístratea
          </Link>
        </p>
      </AuthForm>
    </div>
  );
}

export default Login;
