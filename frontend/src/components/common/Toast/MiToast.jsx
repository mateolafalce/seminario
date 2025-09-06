import React from "react";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiInfo,
} from "react-icons/fi";

// Configuración centralizada para cada tipo de toast
const toastConfig = {
  success: {
    icon: <FiCheckCircle className="w-6 h-6 text-green-400" />,
    border: "border-green-400",
  },
  error: {
    icon: <FiXCircle className="w-6 h-6 text-red-400" />,
    border: "border-red-400",
  },
  warning: {
    icon: <FiAlertTriangle className="w-6 h-6 text-yellow-400" />,
    border: "border-yellow-400",
  },
  info: {
    icon: <FiInfo className="w-6 h-6 text-blue-400" />,
    border: "border-blue-400",
  },
};

const MiToast = ({ mensaje, tipo = "info" }) => {
  const config = toastConfig[tipo] || toastConfig.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`flex items-center gap-4 p-4 rounded-xl shadow-lg border-l-4 bg-slate-800 text-white ${config.border}`}
    >
      <div className="flex-shrink-0">{config.icon}</div>
      <p className="font-semibold text-base">{mensaje}</p>
    </motion.div>
  );
};

export default MiToast;