import React from "react";

const baseClasses = "text-[#0D1B2A] cursor-pointer bg-[#E5FF00] font-medium shadow-md transition-all duration-200 ease-in-out focus:outline-none focus:shadow-[0_0_8px_rgba(200,224,0,0.6)] active:translate-y-[1px] active:shadow-lg hover:text-[#0D1B2A] hover:font-[520] hover:shadow-lg hover:bg-[#E5FF00] hover:-translate-y-0.5 focus:bg-[#E5FF00] focus:text-[#0D1B2A] active:bg-[#E5FF00] active:text-[#0D1B2A]";
const normal = "px-[0.9rem] py-[0.35rem] text-[0.95rem] rounded-full";
const bold = "font-extrabold text-2xl py-[0.4rem] rounded-full";

const Button = ({
    texto,
    onClick,
    type = "button",
    disabled = false,
    className = "",
    variant
}) => (
    <button
        type={type}
        className={`${baseClasses} ${variant === "bold" ? bold : normal} ${className}`}
        onClick={onClick}
        disabled={disabled}
    >
        {texto}
    </button>
);

export default Button;