import React from "react";
import "./Button.css";

const Button = ({ texto, onClick, type = "button", disabled = false, className = "" }) => {
    return (
        <button
            type={type}
            className={`btn ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {texto}
        </button>
    );
};

export default Button;