import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; 
import backendClient from "../../../../shared/services/backendClient";
import Button from "../../../../shared/components/ui/Button/Button";
import ListarCanchas from "../../../canchas/pages/ListarCanchas";
import { MdAccessTime, MdAddCircleOutline, MdOutlineSportsTennis } from "react-icons/md"; 

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

  const irACrear = () => navigate("/panel-control/canchas/nueva");
  const irAEditar = (cancha) => navigate(`/panel-control/canchas/editar/${cancha.id}`);

  const handleEliminarCancha = async (cancha) => {
    if (!window.confirm(`¿Seguro que querés eliminar "${cancha.nombre}"?`)) return;
    try {
      setLoading(true);
      setMensajeError("");
      await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setMensajeError(e?.response?.data?.detail || "Error al eliminar.");
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
    </motion.div>
  );
}