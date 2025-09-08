import React from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa";
import "./MiToast.css";
import { GiTennisBall } from "react-icons/gi"; 

const animation = {
  initial: { opacity: 0, y: -100, rotate: -15 },
  animate: {
    opacity: 1,
    y: 0,
    rotate: [0, -8, 8, -5, 5, 0], // efecto rebote adelante/atrás
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
      mass: 0.5
    }
  },
  exit: {
    opacity: 0,
    y: -50,
    rotate: 0,
    transition: { duration: 0.3 }
  }
};

const MiToast = ({ mensaje, color, tipo = "info" }) => {
  const colores = {
    success: "var(--color-green-400)",
    error: "var(--color-red-400)",
    warning: "var(--color-yellow-400)",
    info: "var(--color-blue-400)"
  };
  
  const colorFinal = color || colores[tipo] || colores.info;

  return (
    <div className="mi-toast-container">
      <div className="mi-toast-icon">
        <GiTennisBall size={40} color={colorFinal} />
      </div>
      <span className="text-[#e5ff00] mi-toast-span">{mensaje}</span>
    </div>
  );
};

export default MiToast;