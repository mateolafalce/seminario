import React, { useState } from "react";
import Button from "../Button/Button";

// reutilizable para login, registro, etc.
// - titulo: texto arriba del formulario
// - campos: lista de campos (nombre, etiqueta, tipo, placeholder)
// - onSubmit: función al enviar el formulario
// - textoBoton: texto del botón
// - cargando: si está true, desactiva el botón y muestra "Cargando..."
// - errores: errores por campo o generales
// - children: contenido extra debajo del botón

function AuthForm({
  titulo,
  campos,
  onSubmit,
  textoBoton = "Enviar",
  cargando = false,
  errores = {},
  children,
}) {

  const [valores, setValores] = useState(
    campos.reduce((acc, campo) => ({ ...acc, [campo.nombre]: "" }), {})
  );

  const handleChange = (e) => {
    setValores({ ...valores, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(valores); 
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full min-w-[33rem] mx-auto py-[1.8rem] px-12 bg-gray-800 rounded-3xl shadow-xl text-base"
    >
      {/* titulo */}
      {titulo && (
        <h2 className="text-[1.4rem] font-bold mb-[1.2rem] text-center text-white">
          {titulo}
        </h2>
      )}

      {/* entradas */}
      {campos.map((campo) => (
        <div key={campo.nombre} className="mb-8 relative">
          <input
            id={campo.nombre}
            name={campo.nombre}
            type={campo.tipo}
            placeholder=" "
            value={valores[campo.nombre]}
            onChange={handleChange}
            className="w-full px-4 pt-6 pb-3 rounded-2xl bg-gray-700 text-white focus:outline-none text-base peer placeholder-transparent"
            autoComplete={campo.autoComplete || "off"}
            disabled={cargando}
          />
          <label
            htmlFor={campo.nombre}
            className={`
              absolute left-3
              pointer-events-none transition-all duration-200
              bg-transparent px-1
              ${valores[campo.nombre] ? "top-2 text-xs text-gray-400" : "top-1/2 -translate-y-1/2 text-base text-gray-400"}
              peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-400 peer-focus:translate-y-0
            `}
          >
            {campo.etiqueta}
          </label>
          {errores[campo.nombre] && (
            <p className="text-red-400 text-[0.95rem] mt-[0.18rem]">
              {errores[campo.nombre]}
            </p>
          )}
        </div>
      ))}

      {/* error general */}
      {errores.general && (
        <div className="text-red-400 text-center mb-[1rem] text-[1rem]">
          {errores.general}
        </div>
      )}

      {/* boton de carga */}
      <Button
        type="submit"
        texto={cargando ? "Cargando..." : textoBoton}
        disabled={cargando}
        className="w-full mt-[0.6rem] text-base py-[0.9rem]"
      />

      {/* extra por ejemplo, links pueden ir */}
      {children}
    </form>
  );
}

export default AuthForm;