import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export default function Sheet({
  open,
  onClose,
  size = "lg",
  children,
  title,
  subtitle,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 flex w-full lg:w-auto">
            <motion.div
              className={`h-full w-full lg:w-[min(90vw,800px)] bg-slate-900/95 border-l border-white/10 shadow-2xl ${sizes[size]} flex flex-col`}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-start justify-between">
                <div>
                  <h3 className="text-white font-extrabold text-lg">{title}</h3>
                  {subtitle && (
                    <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm"
                >
                  Cerrar
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-auto">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
