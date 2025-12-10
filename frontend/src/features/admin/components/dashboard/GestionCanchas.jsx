import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; 
import backendClient from "../../../../shared/services/backendClient";
import Button from "../../../../shared/components/ui/Button/Button";
import ListarCanchas from "../../../canchas/pages/ListarCanchas";
import { MdAccessTime, MdAddCircleOutline, MdOutlineSportsTennis, MdWarning } from "react-icons/md"; 
import { toast } from "react-toastify";
import MiToast from "../../../../shared/components/ui/Toast/MiToast";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0, filter: "blur(2px)" }, 
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring", 
      stiffness: 260, 
      damping: 20    
    }
  }
};

export default function GestionCanchas() {
  const navigate = useNavigate();
  const [mensajeError, setMensajeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [canchaAEliminar, setCanchaAEliminar] = useState(null);

  const irACrear = () => navigate("/panel-control/canchas/nueva");
  const irAEditar = (cancha) => navigate(`/panel-control/canchas/editar/${cancha.id}`);

  const handleEliminarCancha = (cancha) => {
    setCanchaAEliminar(cancha);
  };

  const confirmarEliminacion = async () => {
    if (!canchaAEliminar) return;
    try {
      setLoading(true);
      setMensajeError("");
      await backendClient.delete(`canchas/eliminar/${canchaAEliminar.id}`);
      toast(<MiToast mensaje="Cancha eliminada correctamente" color="#10b981" />);
      setReloadKey((k) => k + 1);
      setCanchaAEliminar(null);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Error al eliminar.";
      setMensajeError(msg);
      toast(<MiToast mensaje={msg} color="#ef4444" />);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      
      {/* ITEM 1: Header */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5"
        variants={itemVariants}
      >
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
             <span className="text-yellow-400"><MdOutlineSportsTennis /></span>
             Gestión de Canchas
          </h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            Aquí podés dar de alta nuevas canchas, modificar precios o ajustar los horarios de disponibilidad.
          </p>
        </div>

        <div className="flex items-center gap-3">
            <Button
                texto="Horarios"
                onClick={() => navigate("/panel-control/canchas/horarios")}
                variant="secondary"
                icon={<MdAccessTime size={18} />}
            />
            <Button
                texto="Nueva Cancha"
                variant="default"
                onClick={irACrear}
                disabled={loading}
                icon={<MdAddCircleOutline size={20} />}
                className="shadow-lg shadow-yellow-400/10"
            />
        </div>
      </motion.div>

      {/* ITEM 2: Error (Solo si existe) */}
      {mensajeError && (
        <motion.div 
          variants={itemVariants}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center"
        >
            <span className="mr-2 font-bold">Error:</span> {mensajeError}
        </motion.div>
      )}

      {/* ITEM 3: La Lista */}
      <motion.div variants={itemVariants}>
        <ListarCanchas
          reloadKey={reloadKey}
          onSeleccionar={irAEditar}
          onEliminar={handleEliminarCancha}
        />
      </motion.div>

      {/* MODAL DE CONFIRMACIÓN */}
      <AnimatePresence>
        {canchaAEliminar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setCanchaAEliminar(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <MdWarning size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar cancha?</h3>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                  Estás a punto de eliminar la cancha <strong className="text-white">{canchaAEliminar.nombre}</strong>.
                  <br/>Esta acción no se puede deshacer.
                </p>
                
                <div className="flex gap-3 w-full">
                  <Button 
                    texto="Cancelar" 
                    onClick={() => setCanchaAEliminar(null)}
                    variant="secondary"
                    className="flex-1 justify-center"
                  />
                  <Button 
                    texto="Sí, eliminar" 
                    onClick={confirmarEliminacion}
                    className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}