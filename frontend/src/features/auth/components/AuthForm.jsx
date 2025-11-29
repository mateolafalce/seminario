import { useState } from "react";
import Button from "../../../shared/components/ui/Button/Button";

// - twoColumns: activa layout grid 2 columnas (en desktop)
// - maxWidth: tailwind para el ancho máximo del card ("max-w-md", "max-w-2xl", etc.)
function AuthForm({
  titulo,
  campos,
  onSubmit,
  textoBoton = "Enviar",
  cargando = false,
  errores = {},
  children,
  twoColumns = false,
  maxWidth,          // 👈 nuevo
}) {
  const [valores, setValores] = useState(() =>
    campos.reduce((acc, campo) => ({ ...acc, [campo.nombre]: "" }), {})
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    const campo = campos.find((c) => c.nombre === name);

    let nuevoValor = value;

    if (campo?.soloDigitos) {
      nuevoValor = (nuevoValor || "").replace(/\D+/g, "");
    }

    setValores((prev) => ({ ...prev, [name]: nuevoValor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(valores);
  };

  const wrapperClass = twoColumns
    ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
    : "space-y-5";

  // 👇 por defecto: forms normales max-w-md, y si es twoColumns max-w-2xl,
  // pero se puede sobreescribir desde fuera con maxWidth.
  const widthClass =
    maxWidth || (twoColumns ? "max-w-2xl" : "max-w-md");

  return (
    <form
      onSubmit={handleSubmit}
      className={`
        ${widthClass}
        w-full mx-auto
        mt-19 mb-16
        px-6 py-8
        rounded-3xl
        bg-slate-900/90
        border border-slate-800
        shadow-[0_18px_45px_rgba(0,0,0,0.65)]
        text-base
      `}
    >
      {titulo && (
        <h2 className="text-[1.6rem] font-extrabold mb-6 text-center text-white tracking-tight">
          {titulo}
        </h2>
      )}

      <div className={wrapperClass}>
        {campos.map((campo) => (
          <div
            key={campo.nombre}
            className={
              twoColumns
                ? `relative ${campo.fullWidth ? "sm:col-span-2" : ""}`
                : "mb-5 relative"
            }
          >
            <input
              id={campo.nombre}
              name={campo.nombre}
              type={campo.tipo}
              placeholder=" "
              value={valores[campo.nombre]}
              onChange={handleChange}
              className="
                w-full
                px-4 pt-5 pb-2.5
                rounded-2xl
                bg-slate-800
                text-white
                border border-slate-700
                focus:outline-none focus:ring-2 focus:ring-yellow-400/80 focus:border-transparent
                text-sm
                peer
                placeholder-transparent
              "
              autoComplete={campo.autoComplete || "off"}
              disabled={cargando}
              inputMode={campo.inputMode}
              pattern={campo.pattern}
              maxLength={campo.maxLength}
              minLength={campo.minLength}
              required={campo.required}
            />
            <label
              htmlFor={campo.nombre}
              className={`
                absolute left-3
                pointer-events-none
                px-1
                transition-all duration-200
                bg-slate-800
                ${
                  valores[campo.nombre]
                    ? "top-1.5 text-[0.7rem] text-slate-400"
                    : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
                }
                peer-focus:top-1.5
                peer-focus:text-[0.7rem]
                peer-focus:text-yellow-300
                peer-focus:translate-y-0
              `}
            >
              {campo.etiqueta}
            </label>
            {errores[campo.nombre] && (
              <p className="text-red-400 text-xs mt-1">
                {errores[campo.nombre]}
              </p>
            )}
          </div>
        ))}
      </div>

      {errores.general && (
        <div className="text-red-400 text-center mb-4 text-sm mt-3">
          {errores.general}
        </div>
      )}

      <Button
        type="submit"
        texto={cargando ? "Cargando..." : textoBoton}
        disabled={cargando}
        className="w-full mt-6 text-sm py-3"
        variant="bold"
      />

      {children && <div className="mt-4">{children}</div>}
    </form>
  );
}

export default AuthForm;
