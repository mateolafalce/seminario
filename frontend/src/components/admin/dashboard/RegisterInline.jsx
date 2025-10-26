import React, { useState } from "react";
import AuthForm from "../../common/AuthForm/AuthForm";
import MessageAlert from "../../common/Alert/MessageAlert";

const BACKEND_URL =
  window.location.hostname === "localhost"
    ? `http://${window.location.hostname}:8000`
    : "";

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

function RegisterInline({ onUsuarioCreado }) {
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", placeholder: "Nombre completo", required: true },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "text", placeholder: "Apellido", required: true },
    { nombre: "email", etiqueta: "Email", tipo: "email", placeholder: "email@ejemplo.com", required: true },
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
    setMensajeExito("");
    setCargando(true);

    // Validación previa
    const dni = onlyDigits(valores.dni);
    const errs = {};
    
    if (!valores.nombre?.trim()) errs.nombre = "Requerido";
    if (!valores.apellido?.trim()) errs.apellido = "Requerido";
    if (!valores.email?.trim()) errs.email = "Requerido";
    if (!valores.username || valores.username.length < 3) errs.username = "Mínimo 3 caracteres";
    if (!valores.password || valores.password.length < 6) errs.password = "Mínimo 6 caracteres";
    if (dni.length < 7 || dni.length > 8) errs.dni = "DNI inválido: 7 u 8 dígitos";

    if (Object.keys(errs).length) {
      setErrores(errs);
      setCargando(false);
      return;
    }

    try {
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/users_b/register`
        : `/api/users_b/register`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: valores.nombre,
          apellido: valores.apellido,
          email: valores.email,
          password: valores.password,
          username: valores.username,
          dni,
        }),
      });

      if (response.ok) {
        setMensajeExito("¡Usuario registrado exitosamente!");
        setTimeout(() => {
          setMensajeExito("");
          onUsuarioCreado?.();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const mappedErrors = fromPydantic422(errorData.detail || errorData);
        setErrores(mappedErrors.general ? mappedErrors : { general: mappedErrors.general || "Error al registrar usuario" });
      }
    } catch {
      setErrores({ general: "Error de conexión con el servidor" });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {mensajeExito && (
        <MessageAlert tipo="success" mensaje={mensajeExito} />
      )}
      <AuthForm
        titulo=""
        campos={campos}
        onSubmit={handleRegister}
        textoBoton="Crear Usuario"
        cargando={cargando}
        errores={errores}
      />
    </div>
  );
}

export default RegisterInline;
