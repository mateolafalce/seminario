import React from 'react';

const baseClasses = 'text-[#0D1B2A] px-[0.9rem] py-[0.35rem] cursor-pointer rounded-full bg-[#E5FF00] text-[0.95rem] font-medium shadow-md transition-all duration-200 ease-in-out focus:outline-none focus:shadow-[0_0_8px_rgba(200,224,0,0.6)] active:translate-y-[1px] active:shadow-lg';
const hoverClasses = 'hover:text-[#0D1B2A] hover:font-[520] hover:shadow-lg hover:bg-[#E5FF00] hover:-translate-y-0.5';
const focusClasses = 'focus:bg-[#E5FF00] focus:text-[#0D1B2A]';
const activeClasses = 'active:bg-[#E5FF00] active:text-[#0D1B2A]';

const Button = ({
    texto,
    onClick,
    type = 'button',
    disabled = false,
    className = '',
    style
}) => {
    return (
        <button
            type={type}
            className={baseClasses + ' ' + hoverClasses + ' ' + focusClasses + ' ' + activeClasses + ' ' + className}
            onClick={onClick}
            disabled={disabled}
            style={style}
        >
            {texto}
        </button>
    );
};

export default Button;