import React from "react";

const baseClasses = "text-[#0D1B2A] cursor-pointer bg-[#E5FF00] font-medium shadow-md transition-all duration-200 ease-in-out rounded-full focus:outline-none focus:shadow-[0_0_8px_rgba(200,224,0,0.6)] active:translate-y-[1px] active:shadow-lg hover:text-[#0D1B2A] hover:font-semibold hover:shadow-lg hover:bg-[#eaff00] hover:-translate-y-0.5 focus:bg-[#E5FF00] focus:text-[#0D1B2A] active:bg-[#E5FF00] active:text-[#0D1B2A]";
const normal = "px-4 py-1 text-sm";
const bold = "px-6 py-2 text-base font-bold";

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