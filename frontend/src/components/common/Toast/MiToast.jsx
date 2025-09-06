import React from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle } from "react-icons/fi";

// Mapeo de tipos de toast a iconos y colores
const toastConfig = {
  success: {
    icon: <FiCheckCircle className="w-6 h-6 text-green-400" />,
    barClass: "bg-green-400",
  },
  error: {
    icon: <FiXCircle className="w-6 h-6 text-red-400" />,
    barClass: "bg-red-400",
  },
  info: {
    icon: <FiInfo className="w-6 h-6 text-blue-400" />,
    barClass: "bg-blue-400",
  },
  warning: {
    icon: <FiAlertTriangle className="w-6 h-6 text-yellow-400" />,
    barClass: "bg-yellow-400",
  },
};

const MiToast = ({ type, message }) => {
  const { icon } = toastConfig[type] || toastConfig.info;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">{icon}</div>
      <p className="text-base font-medium text-slate-100 leading-tight">
        {message}
      </p>
    </div>
  );
};

export default MiToast;