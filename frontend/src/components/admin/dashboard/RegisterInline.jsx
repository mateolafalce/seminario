import React, { useContext, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import AuthForm from "../../common/AuthForm/AuthForm";
import MessageAlert from "../../common/Alert/MessageAlert";

const BACKEND_URL = `http://${window.location.hostname}:8000`;

function RegisterInline({ onUsuarioCreado }) {
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", placeholder: "Nombre completo" },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "text", placeholder: "Apellido" },
    { nombre: "email", etiqueta: "Email", tipo: "email", placeholder: "correo@ejemplo.com", autoComplete: "email" },
    { nombre: "username", etiqueta: "Nombre de usuario", tipo: "text", placeholder: "Nombre de usuario", autoComplete: "username" },
    { nombre: "password", etiqueta: "Contraseña", tipo: "password", placeholder: "Contraseña", autoComplete: "new-password" }
  ];

  const handleRegister = async (valores) => {
    setErrores({});
    setMensajeExito("");
    setCargando(true);

    // Validación básica de contraseña
    if (valores.password.length < 6) {
      setErrores({ password: "La contraseña debe tener al menos 6 caracteres" });
      setCargando(false);
      return;
    }

    try {
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/users_b/register`
        : "/api/users_b/register";
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify({
          nombre: valores.nombre,
          apellido: valores.apellido,
          email: valores.email,
          password: valores.password,
          username: valores.username,
        }),
      });

      if (response.ok) {
        setMensajeExito("¡Usuario registrado exitosamente!");
        // Limpiar formulario después de registro exitoso
        setTimeout(() => {
          setMensajeExito("");
          // Notificar al componente padre que se creó un usuario
          if (onUsuarioCreado) {
            onUsuarioCreado();
          }
        }, 1500);
      } else {
        const errorData = await response.json();
        setErrores({ general: errorData.detail || "Error al registrar usuario" });
      }
    } catch (error) {
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