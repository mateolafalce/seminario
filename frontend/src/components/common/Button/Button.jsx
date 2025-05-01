import React from "react";

const baseClasses = "text-[#0D1B2A] px-6 py-3 cursor-pointer rounded-lg border-0 bg-gradient-to-br from-[#E5FF00] to-[#E5FE00] text-base font-medium shadow-md transition-all duration-300 ease-in-out focus:outline-none focus:shadow-[0_0_8px_rgba(200,224,0,0.6)] active:translate-y-[1px] active:shadow-lg";
const hoverClasses = "hover:text-[#0D1B2A] hover:font-[520] hover:shadow-lg hover:bg-gradient-to-br hover:from-[#E5FF00] hover:to-[#E5FD00] hover:-translate-y-0.5";
const focusClasses = "focus:bg-gradient-to-br focus:from-[#E5FF00] focus:to-[#E5FE00] focus:text-[#0D1B2A]";
const activeClasses = "active:bg-gradient-to-br active:from-[#E5FF00] active:to-[#E5FD00] active:text-[#0D1B2A]";

const Button = ({
    texto,
    onClick,
    type = "button",
    disabled = false,
    className = "",
}) => {
    return (
        <button
            type={type}
            className={`${baseClasses} ${hoverClasses} ${focusClasses} ${activeClasses} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {texto}
        </button>
    );
};

export default Button;