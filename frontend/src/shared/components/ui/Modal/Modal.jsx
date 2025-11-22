//seria como una ventana emergente reutilizable para mensajes, formularios, etc
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  closeOnOverlayClick = true,
}) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Fondo / overlay */}
          <motion.div
            className="absolute inset-0 bg-[#0D1B2A]/30 backdrop-blur-[0.375rem] z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 20,
              duration: 0.32,
            }}
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Contenido del modal */}
          <motion.div
            className={`relative z-10 bg-gray-800 rounded-3xl shadow-2xl w-full ${sizeClasses[size]} mx-4 border border-gray-700`}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 24,
              delay: 0.08,
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Modal;