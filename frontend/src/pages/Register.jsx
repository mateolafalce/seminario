import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthForm from '../components/common/AuthForm/AuthForm';
import MessageAlert from '../components/common/Alert/MessageAlert';
import backendClient from '../services/backendClient';
import { errorToast } from '../utils/apiHelpers';

const onlyDigits = (s) => (s || "").replace(/\D+/g, "");

// Helper para mapear errores 422 de Pydantic
const fromPydantic422 = (detail) => {
  const errores = {};
  if (Array.isArray(detail)) {
    for (const d of detail) {
      const field = Array.isArray(d.loc) ? d.loc.at(-1) : d.loc;
      if (field) errores[field] = d.msg || "Valor inválido";
    }
  } else if (typeof detail === "string") {
    errores.general = detail;
  }
  return errores;
};

// Normalizar errores de la API
const normalizeApiError = async (error) => {
  const data = error?.response?.data || {};
  if (data.detail) return fromPydantic422(data.detail);
  if (typeof data === "string") return { general: data };
  if (error.message) return { general: error.message };
  return { general: "Error desconocido" };
};

function Register() {
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const esAdmin = params.get('admin') === '1';

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", placeholder: "Tu nombre", required: true },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "text", placeholder: "Tu apellido", required: true },
    { nombre: "email", etiqueta: "Email", tipo: "email", placeholder: "tu@email.com", required: true },
    { 
      nombre: "username", 
      etiqueta: "Nombre de usuario", 
      tipo: "text", 
      placeholder: "Nombre de usuario", 
      autoComplete: "username",
      minLength: 3,
      maxLength: 30,
      required: true
    },
    { 
      nombre: "password", 
      etiqueta: "Contraseña", 
      tipo: "password", 
      placeholder: "Contraseña", 
      autoComplete: "new-password",
      minLength: 6,
      required: true
    },
    { 
      nombre: "repeatPassword", 
      etiqueta: "Repetir Contraseña", 
      tipo: "password", 
      placeholder: "Repite tu contraseña", 
      autoComplete: "new-password",
      minLength: 6,
      required: true
    },
    { 
      nombre: "dni", 
      etiqueta: "DNI (7–8 dígitos)", 
      tipo: "text", 
      placeholder: "DNI", 
      inputMode: "numeric", 
      pattern: "\\d{7,8}", 
      maxLength: 8,
      required: true
    },
  ];

  const handleRegister = async (valores) => {
    setErrores({});
    setMensajeExito('');
    setCargando(true);

    // Validación previa
    const dni = onlyDigits(valores.dni);
    const errs = {};
    
    if (!valores.nombre?.trim()) errs.nombre = "Requerido";
    if (!valores.apellido?.trim()) errs.apellido = "Requerido";
    if (!valores.email?.trim()) errs.email = "Requerido";
    if (!valores.username || valores.username.length < 3) errs.username = "Mínimo 3 caracteres";
    if (!valores.password || valores.password.length < 6) errs.password = "Mínimo 6 caracteres";
    if (valores.password !== valores.repeatPassword) errs.repeatPassword = "Las contraseñas no coinciden";
    if (dni.length < 7 || dni.length > 8) errs.dni = "DNI inválido: 7 u 8 dígitos";

    if (Object.keys(errs).length) {
      setErrores(errs);
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
        dni,
      });

      setMensajeExito('¡Usuario registrado! Revisa tu email para habilitar la cuenta.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      const mappedErrors = await normalizeApiError(error);
      setErrores(mappedErrors);
      errorToast(mappedErrors.general || 'Error al registrar usuario');
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
