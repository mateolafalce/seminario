import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // <---
import adminApi from "../../../shared/services/adminApi";
import ReservaFormAdmin from "../components/ReservaFormAdmin";
import { FiArrowLeft } from "react-icons/fi";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

export default function PersistirReservaAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (payload) => {
    try {
      setLoading(true);
      await adminApi.reservas.crearReservaAdmin(payload);
      toast(<MiToast mensaje="Reserva creada con éxito" color="#10b981" />);
      navigate("/panel-control/reservas");
    } catch (e) {
      toast(<MiToast mensaje={e?.message || "Error al crear reserva"} color="#ef4444" />);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="max-w-5xl mx-auto space-y-6 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 border-b border-gray-700 pb-4 mb-6">
        <button 
            onClick={() => navigate("/panel-control/reservas")}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition"
        >
            <FiArrowLeft size={24} />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-white">Nueva Reserva</h2>
            <p className="text-gray-400 text-sm">Registrar un turno manualmente para usuarios.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ReservaFormAdmin onSubmit={handleSubmit} loading={loading} />
      </motion.div>
    </motion.div>
  );
}