import React from "react";

const baseClasses = "text-[#0D1B2A] cursor-pointer bg-[#E5FF00] font-medium shadow-md transition-all duration-200 ease-in-out rounded-full focus:outline-none active:translate-y-[1px] active:shadow-sm hover:text-[#0D1B2A] hover:shadow-lg hover:bg-[#eaff00] hover:-translate-y-1 focus:bg-[#E5FF00] focus:text-[#0D1B2A] active:bg-[#E5FF00] active:text-[#0D1B2A] px-3 py-1 text-sm";

const Button = ({
    texto,
    onClick,
    type = "button",
    disabled = false,
    className = ""
}) => (
    <button
        type={type}
        className={`${baseClasses} ${className}`}
        onClick={onClick}
        disabled={disabled}
    >
        {texto}
    </button>
);

export default Button;