import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthForm from '../components/common/AuthForm/AuthForm';
import MessageAlert from '../components/common/Alert/MessageAlert';
import MiToast from "../components/common/Toast/MiToast";
import { toast } from 'react-toastify';

const BACKEND_URL = `http://${window.location.hostname}:8000`;

function Register() {
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const esAdmin = params.get('admin') === '1';
  const { loginWithToken } = useContext(AuthContext);

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", placeholder: "Tu nombre" },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "text", placeholder: "Tu apellido" },
    { nombre: "telefono", etiqueta: "Teléfono", tipo: "text", placeholder: "Ej: 1122334455" }, // Cambiado
    { nombre: "username", etiqueta: "Nombre de usuario", tipo: "text", placeholder: "Nombre de usuario", autoComplete: "username" },
    { nombre: "password", etiqueta: "Contraseña", tipo: "password", placeholder: "Contraseña", autoComplete: "new-password" },
    { nombre: "repeatPassword", etiqueta: "Repetir Contraseña", tipo: "password", placeholder: "Repite tu contraseña", autoComplete: "new-password" },
  ];

  const handleRegister = async (valores) => {
    setErrores({});
    setMensajeExito('');
    setCargando(true);

    if (valores.password !== valores.repeatPassword) {
      setErrores({ repeatPassword: "Las contraseñas no coinciden" });
      setCargando(false);
      return;
    }

    try {
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/users_b/register`
        : "/api/users_b/register";
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: valores.nombre,
          apellido: valores.apellido,
          telefono: valores.telefono, 
          password: valores.password,
          username: valores.username,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setMensajeExito('¡Usuario registrado exitosamente!');
        loginWithToken(data.accessToken);
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        const errorData = await response.json();
        setErrores({ general: errorData.detail || 'Error al registrar usuario' });
      }
    } catch (error) {
      setErrores({ general: 'Error de conexión con el servidor' });
      toast(<MiToast mensaje="Error del servidor" color="var(--color-red-400)"/>);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className='mt-[3rem]'>
      {mensajeExito && (
        <MessageAlert tipo='success' mensaje={mensajeExito} />
      )}
      <AuthForm
        titulo="Crear Usuario"
        campos={campos}
        onSubmit={handleRegister}
        textoBoton="Crear Usuario"
        cargando={cargando}
        errores={errores}
      >
        {!esAdmin && (
          <p className='mt-4 text-center text-white'>
            ¿Ya tienes cuenta?{' '}
            <a href='/login' className='text-[#E5FF00] hover:underline'>
              Inicia sesión
            </a>
          </p>
        )}
      </AuthForm>
    </div>
  );
}

export default Register;