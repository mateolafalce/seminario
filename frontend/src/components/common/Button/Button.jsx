import React from "react";

const variants = {
  primary:   "bg-amber-300 text-slate-950 hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300",
  yellow:    "bg-yellow-400 text-slate-950 hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-yellow-400",
  secondary: "bg-slate-700 text-white hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-white/30",
  danger:    "bg-rose-500 text-white hover:bg-rose-400 focus-visible:ring-2 focus-visible:ring-rose-400",
  disabled:  "bg-slate-700 text-slate-400 cursor-not-allowed",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-5 py-2.5 text-base rounded-xl",
};

const base =
  "inline-flex items-center justify-center font-extrabold transition-all active:translate-y-[1px] shadow-sm hover:shadow focus:outline-none select-none";

const Button = ({
  texto,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}) => {
  const v = disabled ? "disabled" : variant;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[base, variants[v] || variants.primary, sizes[size] || sizes.md, className].join(" ")}
      {...props}
    >
      {texto}
    </button>
  );
};

export default Button;
