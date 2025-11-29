import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import MessageAlert from '../../../shared/components/ui/Alert/MessageAlert';
import backendClient from '../../../shared/services/backendClient';
import { errorToast } from '../../../shared/utils/apiHelpers';

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

  // 👇 Layout: 2 columnas en desktop, 1 en mobile.
  // Nombre / Apellido
  // Email (full)
  // Usuario / Teléfono
  // Contraseña / Repetir
  // DNI (full)
  const campos = [
    {
      nombre: "nombre",
      etiqueta: "Nombre",
      tipo: "text",
      placeholder: "Tu nombre",
      required: true,
    },
    {
      nombre: "apellido",
      etiqueta: "Apellido",
      tipo: "text",
      placeholder: "Tu apellido",
      required: true,
    },
    {
      nombre: "email",
      etiqueta: "Email",
      tipo: "email",
      placeholder: "tu@email.com",
      required: true,
      fullWidth: true,   // 👈 ocupa fila completa
    },
    {
      nombre: "username",
      etiqueta: "Nombre de usuario",
      tipo: "text",
      placeholder: "Nombre de usuario",
      autoComplete: "username",
      minLength: 1,
      maxLength: 30,
      required: true,
    },
    {
      nombre: "telefono",
      etiqueta: "Teléfono",
      tipo: "text",
      placeholder: "Tu teléfono",
      inputMode: "numeric",
      maxLength: 20,
      soloDigitos: true,
      required: false,
    },
    {
      nombre: "password",
      etiqueta: "Contraseña",
      tipo: "password",
      placeholder: "Contraseña",
      autoComplete: "new-password",
      minLength: 1,
      required: true,
    },
    {
      nombre: "repeatPassword",
      etiqueta: "Repetir Contraseña",
      tipo: "password",
      placeholder: "Repite tu contraseña",
      autoComplete: "new-password",
      minLength: 1,
      required: true,
    },
    {
      nombre: "dni",
      etiqueta: "DNI (1–10 dígitos)",
      tipo: "text",
      placeholder: "DNI",
      inputMode: "numeric",
      maxLength: 10,
      soloDigitos: true,
      required: true,
      fullWidth: true,   // 👈 también fila completa
    },
  ];

  const handleRegister = async (valores) => {
    setErrores({});
    setMensajeExito('');
    setCargando(true);

    const dni = onlyDigits(valores.dni);
    const telefono = onlyDigits(valores.telefono);
    const errs = {};

    if (!valores.nombre?.trim()) errs.nombre = "Requerido";
    if (!valores.apellido?.trim()) errs.apellido = "Requerido";
    if (!valores.email?.trim()) errs.email = "Requerido";
    if (!valores.username || valores.username.length < 1)
      errs.username = "Requerido";
    if (!valores.password || valores.password.length < 1)
      errs.password = "Requerido";
    if (valores.password !== valores.repeatPassword)
      errs.repeatPassword = "Las contraseñas no coinciden";

    if (dni.length < 1 || dni.length > 10) {
      errs.dni = "DNI inválido: 1 a 10 dígitos";
    }

    // Teléfono: opcional, pero si lo completa validamos longitud
    if (telefono && (telefono.length < 5 || telefono.length > 20)) {
      errs.telefono = "Teléfono inválido";
    }

    if (Object.keys(errs).length) {
      setErrores(errs);
      setCargando(false);
      return;
    }

    try {
      await backendClient.post("users_b/register", {
        nombre: valores.nombre,
        apellido: valores.apellido,
        email: valores.email,
        password: valores.password,
        username: valores.username,
        dni,
        telefono: telefono || null,
      });

      setMensajeExito(
        "¡Usuario registrado! Revisa tu email para habilitar la cuenta."
      );
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      const mappedErrors = await normalizeApiError(error);
      setErrores(mappedErrors);
      errorToast(mappedErrors.general || "Error al registrar usuario");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mt-8 px-4">
      {mensajeExito && (
        <MessageAlert tipo="success" mensaje={mensajeExito} />
      )}

      <AuthForm
        titulo="Crear Usuario"
        campos={campos}
        onSubmit={handleRegister}
        textoBoton="Crear Usuario"
        cargando={cargando}
        errores={errores}
        twoColumns={true}    
      >
        {!esAdmin && (
          <p className="mt-4 text-center text-slate-200 text-sm">
            ¿Ya tienes cuenta?{" "}
            <a
              href="/login"
              className="text-yellow-300 hover:underline font-normal text-xs sm:text-sm"
            >
              Inicia sesión
            </a>
          </p>
        )}
      </AuthForm>
    </div>
  );
}

export default Register;
