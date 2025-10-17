import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiX } from 'react-icons/fi';

function MessageConfirm({ mensaje, onClose, onConfirm, onCancel }) {
  const baseClasses =
    "mr-4 bg-[#0D1B2A] text-white cursor-pointer font-medium shadow-md transition-all duration-200 ease-in-out rounded-full focus:outline-none active:translate-y-[1px] active:shadow-sm hover:text-[#E5FF00] hover:shadow-lg hover:scale-105 focus:bg-[#0D1B2A] focus:text-white active:bg-[#0D1B2A] active:text-white px-3 py-1 text-sm border border-white/20";

  const bg = 'bg-[#f4ff52]/90';
  const text = 'text-[#0D1B2A]';
  const border = 'border-[#0D1B2A]';
  const icon = <FiCheckCircle style={{ fontSize: '3rem', marginBottom: '1.2rem' }} />;
  const shadow = 'shadow-[0_0_1.5rem_#f4ff52]';

  return (
    <AnimatePresence>
      {mensaje && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(0.25rem)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        >
          {/* fondo semitransparente */}
          <motion.div
            className="absolute inset-0 bg-[#0D1B2A]/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* card del mensaje */}
          <motion.div
            className={`relative max-w-[32rem] w-full py-[2.5rem] px-[2.5rem] rounded-[1.5rem] ${bg} ${text} ${shadow} border-[0.25rem] ${border} text-center`}
            initial={{ scale: 0.9, y: '1.25rem' }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: '1.25rem' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* cierre */}
            {onClose && (
              <button
                onClick={onClose}
                className={`absolute top-[1rem] right-[1rem] p-[0.5rem] rounded-full ${text} hover:bg-black/10 transition-colors`}
                aria-label="Cerrar"
                style={{ fontSize: '1.5rem' }}
              >
                <FiX />
              </button>
            )}

            {/* icono */}
            <div className="flex justify-center">
              {icon}
            </div>

            {/* mensaje */}
            <p className="text-[1.25rem] font-bold mb-[0.7rem]">
              {mensaje}
            </p>

            <div className="flex justify-center mt-4">
              <button
                onClick={onConfirm}
                className={`${baseClasses}`}
              >
                Confirmar
              </button>
              <button
                onClick={onCancel}
                className={`${baseClasses}`}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MessageConfirm;
