import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiX } from 'react-icons/fi';

function MessageAlert({ mensaje, onClose }) {
  
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
          transition={{ duration: 0.3 }}
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
            <h3 className="text-[2rem] font-bold mb-[0.7rem]">
              Éxito
            </h3>
            <p className="text-[1.15rem]">{mensaje}</p>
            
            {/* barra de progreso */}
            <motion.div
              className="absolute bottom-0 left-0 h-[0.3rem] bg-[#0D1B2A] rounded-b-[1.5rem]"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 3, ease: 'linear' }}
              onAnimationComplete={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MessageAlert;