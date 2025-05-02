import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/common/AuthForm/AuthForm';
import MessageAlert from '../components/common/Alert/MessageAlert';

function Register() {
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const navigate = useNavigate();
  const { loginWithToken, isAdmin } = useContext(AuthContext);

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", placeholder: "Tu nombre" },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "text", placeholder: "Tu apellido" },
    { nombre: "email", etiqueta: "Email", tipo: "email", placeholder: "correo@ejemplo.com", autoComplete: "email" },
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
      const response = await fetch('http://127.0.0.1:8000/users_b/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: valores.nombre,
          apellido: valores.apellido,
          email: valores.email,
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
        }, 1500); // Espera 1.5 segundos antes de redirigir al home
      } else {
        const errorData = await response.json();
        setErrores({ general: errorData.detail || 'Error al registrar usuario' });
      }
    } catch (error) {
      setErrores({ general: 'Error de conexión con el servidor' });
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
        botonVariant="bold"
        botonClassName="py-5" // más alto arriba y abajo
      >
        {!isAdmin && (
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