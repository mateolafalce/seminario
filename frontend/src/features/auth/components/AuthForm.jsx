import React, { useState } from "react";
import Button from "../../../shared/components/ui/Button/Button";

// reutilizable para login, registro, etc.
// - titulo: texto arriba del formulario
// - campos: lista de campos (nombre, etiqueta, tipo, placeholder, inputMode, pattern, maxLength, autoComplete)
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
      className="max-w-lg min-w-[10rem] mx-auto py-[1.8rem] mb-[4rem] px-[3rem] bg-gray-800 rounded-3xl text-base"
    >
      {titulo && (
        <h2 className="text-[1.4rem] font-bold mb-[1.2rem] text-center text-white">
          {titulo}
        </h2>
      )}

      {campos.map((campo) => (
        <div key={campo.nombre} className="mb-[2rem] relative">
          <input
            id={campo.nombre}
            name={campo.nombre}
            type={campo.tipo}
            placeholder=" "
            value={valores[campo.nombre]}
            onChange={handleChange}
            className="w-full px-[1rem] pt-[1.5rem] pb-[0.75rem] rounded-2xl bg-gray-700 text-white focus:outline-none text-base peer placeholder-transparent"
            autoComplete={campo.autoComplete || "off"}
            disabled={cargando}
            // 👇 props extra útiles para el DNI
            inputMode={campo.inputMode}
            pattern={campo.pattern}
            maxLength={campo.maxLength}
          />
          <label
            htmlFor={campo.nombre}
            className={`absolute left-[0.75rem] pointer-events-none transition-all duration-200 bg-transparent px-[0.25rem] ${
              valores[campo.nombre]
                ? "top-[0.5rem] text-xs text-gray-400"
                : "top-1/2 -translate-y-1/2 text-base text-gray-400"
            } peer-focus:top-[0.5rem] peer-focus:text-xs peer-focus:text-gray-400 peer-focus:translate-y-0`}
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

      {errores.general && (
        <div className="text-red-400 text-center mb-[1rem] text-[1rem]">
          {errores.general}
        </div>
      )}

      <Button
        type="submit"
        texto={cargando ? "Cargando..." : textoBoton}
        disabled={cargando}
        className="w-full mt-[0.6rem] text-base py-[0.9rem]"
        variant="bold"
      />

      {children}
    </form>
  );
}

export default AuthForm;
