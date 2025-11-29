import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // <---
import adminApi from "../../../shared/services/adminApi";
import UsuarioForm from "../components/UsuarioForm";
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

export default function PersistirUsuarioAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formValues) => {
    try {
      setLoading(true);

      const payload = {
        nombre: formValues.nombre,
        apellido: formValues.apellido,
        email: formValues.email,
        dni: String(formValues.dni ?? "").trim(),
        username: formValues.username,
        password: formValues.password,
        telefono: formValues.telefono || null,
        habilitado: false, 
      };

      await adminApi.users.create(payload);

      toast(
        <MiToast
          mensaje="Usuario creado exitosamente. Debe confirmar su email para habilitarse."
          color="#10b981"
        />
      );
      navigate("/panel-control/usuarios");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || e.message || "Error al crear usuario";
      toast(<MiToast mensaje={msg} color="#ef4444" />);
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
          onClick={() => navigate("/panel-control/usuarios")}
          className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition"
        >
          <FiArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Nuevo Usuario</h2>
          <p className="text-gray-400 text-sm">
            Dar de alta un nuevo cliente o administrador.
          </p>
        </div>
      </motion.div>

      {/* Formulario */}
      <motion.div variants={itemVariants}>
        <UsuarioForm
          mode="create"
          showAuthFields={true}
          onSubmit={handleSubmit}
          loading={loading}
          submitText="Crear Usuario"
        />
      </motion.div>
    </motion.div>
  );
}