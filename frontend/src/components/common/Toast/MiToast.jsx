import React from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle } from "react-icons/fi";

// Configuración de iconos y colores por tipo de toast
const toastConfig = {
  success: {
    icon: <FiCheckCircle className="w-6 h-6 text-green-400" />,
  },
  error: {
    icon: <FiXCircle className="w-6 h-6 text-red-400" />,
  },
  info: {
    icon: <FiInfo className="w-6 h-6 text-blue-400" />,
  },
  warning: {
    icon: <FiAlertTriangle className="w-6 h-6 text-yellow-400" />,
  },
};

/**
 * Componente que renderiza el contenido interno de una notificación.
 * @param {'success'|'error'|'info'|'warning'} type - El tipo de notificación.
 * @param {string} message - El mensaje a mostrar.
 */
const MiToast = ({ type, message }) => {
  // Selecciona el icono correcto o usa 'info' por defecto
  const { icon } = toastConfig[type] || toastConfig.info;

  return (
    // Layout del contenido: icono a la izquierda, texto a la derecha
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 break-words">
          {message}
        </p>
      </div>
    </div>
  );
};

export default MiToast;