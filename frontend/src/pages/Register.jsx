import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthForm from '../components/common/AuthForm/AuthForm';
import MessageAlert from '../components/common/Alert/MessageAlert';
import backendClient from '../services/backendClient';
import { errorToast } from '../utils/apiHelpers';

function Register() {
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const esAdmin = params.get('admin') === '1';

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", placeholder: "Tu nombre" },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "text", placeholder: "Tu apellido" },
    { nombre: "email", etiqueta: "Email", tipo: "email", placeholder: "tu@email.com" },
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
      await backendClient.post('users_b/register', {
        nombre: valores.nombre,
        apellido: valores.apellido,
        email: valores.email,
        password: valores.password,
        username: valores.username,
      });

      setMensajeExito('¡Usuario registrado! Revisa tu email para habilitar la cuenta.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setErrores({ general: error.message || 'Error al registrar usuario' });
      errorToast(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className='mt-[3rem]'>
      {mensajeExito && <MessageAlert tipo='success' mensaje={mensajeExito} />}
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
