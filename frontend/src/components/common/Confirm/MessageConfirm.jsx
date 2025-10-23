import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle } from 'react-icons/fi';

function MessageConfirm({ mensaje, onClose, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {mensaje && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Fondo difuminado */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Caja del mensaje */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 text-center text-white"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Botón de cierre */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-slate-300 hover:text-white"
                aria-label="Cerrar"
              >
                <FiX size={22} />
              </button>
            )}

            {/* Ícono de confirmación */}
            <div className="flex justify-center mb-3">
              <FiCheckCircle size={46} className="text-amber-400" />
            </div>

            {/* Mensaje */}
            <p className="text-lg font-semibold mb-5 text-white">
              {mensaje}
            </p>

            {/* Botones */}
            <div className="flex justify-center gap-3">
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg bg-amber-400 text-[#0B1220] font-bold hover:bg-amber-300 transition-all"
              >
                Confirmar
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
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
