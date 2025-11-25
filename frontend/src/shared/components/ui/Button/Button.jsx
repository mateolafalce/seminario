import React from "react";

const variants = {
  // MODERNIZADO: "Glow" amarillo suave y texto oscuro fuerte
  default:   "bg-yellow-400 text-slate-950 hover:bg-yellow-300 border border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.15)] hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] focus-visible:ring-yellow-400",
  
  // MODERNIZADO: Fondo oscuro (slate-800) con borde sutil
  secondary: "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 focus-visible:ring-slate-500",
  
  // MODERNIZADO: Rojo con fondo translúcido (estilo alerta moderna)
  danger:    "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50 focus-visible:ring-red-500",
  
  // MODERNIZADO: Ghost más limpio
  ghost:     "bg-transparent text-slate-400 hover:text-yellow-400 hover:bg-slate-800/50",
  
  disabled:  "bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed",

  // Mantenemos estos por compatibilidad con tu código existente
  primary:   "bg-yellow-400 text-slate-950 hover:bg-yellow-300", 
  cancelar:  "bg-slate-700 text-white hover:bg-slate-600",
  eliminar:  "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20", 
  modificar: "bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30", 
  session:   "bg-transparent text-white border border-white/10 hover:bg-white/5",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs font-medium rounded-md", // Un poco más cuadrados (moderno)
  md: "px-5 py-2 text-sm font-medium rounded-lg",
  lg: "px-8 py-3 text-base font-semibold rounded-lg",
};

const base =
  "inline-flex items-center justify-center transition-all duration-200 ease-out " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 select-none " + 
  "active:scale-[0.98]"; // Efecto de click sutil

export default function Button({
  texto,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  variant = "default",
  size = "md",
  icon,
  ...props
}) {
  const v = disabled ? "disabled" : variant;
  // Fallback a default si la variante no existe
  const selectedVariant = variants[v] || variants.default;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[base, selectedVariant, sizes[size] || sizes.md, className].join(" ")}
      {...props}
    >
      {icon && <span className="mr-2 flex items-center">{icon}</span>}
      {texto}
    </button>
  );
}