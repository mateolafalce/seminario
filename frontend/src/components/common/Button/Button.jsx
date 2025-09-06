import React from "react";

const variants = {
  primary:
    "text-[#0D1B2A] bg-[#E5FF00] hover:bg-[#eaff00] focus:bg-[#E5FF00] active:bg-[#E5FF00] hover:text-[#0D1B2A]",
  yellow:
    "text-[#0D1B2A] bg-[#fdc700] hover:bg-yellow-400 focus:bg-[#fdc700] active:bg-[#fdc700] hover:text-[#0D1B2A]",
  secondary:
    "text-white bg-slate-600 hover:bg-slate-500 focus:bg-slate-600 active:bg-slate-600 hover:text-white",
};

const baseClasses = "text-[#0D1B2A] cursor-pointer bg-[#E5FF00] font-medium shadow-md transition-all duration-200 ease-in-out rounded-full focus:outline-none active:translate-y-[1px] active:shadow-sm hover:text-[#0D1B2A] hover:shadow-lg hover:bg-[#eaff00] hover:-translate-y-1 focus:bg-[#E5FF00] focus:text-[#0D1B2A] active:bg-[#E5FF00] active:text-[#0D1B2A] px-3 py-1 text-sm";

const Button = ({
  texto,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  variant = "primary", // por defecto es primary, así no rompe nada
  ...props
}) => (
  <button
    type={type}
    className={`${baseClasses} ${variants[variant] || variants.primary} ${className}`}
    onClick={onClick}
    disabled={disabled}
    {...props}
  >
    {texto}
  </button>
);

export default Button;