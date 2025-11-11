import React from "react";

const variants = {
  // Base equivalentes a tu diseño
  primary:   "bg-yellow-400 text-slate-900 hover:bg-yellow-300 focus-visible:ring-yellow-400",
  secondary: "bg-slate-800 text-white hover:bg-slate-700 focus-visible:ring-white/10",
  danger:    "bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-400",
  ghost:     "bg-slate-700/40 text-yellow-300 hover:bg-slate-700/70 hover:text-white focus-visible:ring-yellow-300",
  disabled:  "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60",

  // Variantes usadas por tu app:
  default:   "bg-yellow-400 text-slate-900 hover:bg-yellow-300 focus-visible:ring-yellow-400",
  cancelar:  "bg-gray-600 text-white hover:bg-gray-500 focus-visible:ring-gray-400",
  eliminar:  "bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-400",
  modificar: "bg-blue-500 text-white hover:bg-blue-400 focus-visible:ring-blue-400",
  session:   "bg-transparent text-white border border-white/20 hover:bg-white/10 focus-visible:ring-yellow-400",
};

const sizes = {
  sm: "px-4 py-1.5 text-xs rounded-lg",
  md: "px-6 py-2 text-sm rounded-lg",
  lg: "px-8 py-3 text-base rounded-lg",
};

const base =
  "inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-300 ease-out " +
  "shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 select-none";

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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        base,
        variants[v] || variants.default,
        sizes[size] || sizes.md,
        className,
      ].join(" ")}
      {...props}
    >
      {icon && <span className="w-4 h-4 mr-2">{icon}</span>}
      {texto}
    </button>
  );
}
