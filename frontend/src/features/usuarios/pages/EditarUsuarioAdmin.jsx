import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import { toast } from "react-toastify";
import { useMemo } from "react";

import adminApi from "../../../shared/services/adminApi";
import UsuarioForm from "../components/UsuarioForm";
import MiToast from "../../../shared/components/ui/Toast/MiToast";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
};

export default function EditarUsuarioAdmin() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const usuario = state?.usuario || null;

  // Si alguien entra directo por URL sin pasar state
  if (!usuario) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-slate-300">
        <p className="mb-4">
          No se encontró el usuario a editar. Probablemente entraste directo a la URL o recargaste la página.
        </p>
        <button
          onClick={() => navigate("/panel-control/usuarios")}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 hover:bg-slate-700 transition"
        >
          Volver a Usuarios
        </button>
      </div>
    );
  }

  const p = usuario.persona || {};

  const initialValues = useMemo(() => ({
    id: usuario.id,
    nombre: usuario.nombre || p.nombre || "",
    apellido: usuario.apellido || p.apellido || "",
    email: usuario.email || p.email || "",
    categoria: typeof usuario.categoria === "string" ? usuario.categoria : "",
    habilitado: usuario.habilitado ?? usuario.habilitada ?? false,
    dni: usuario.dni || p.dni || "",
    telefono: usuario.telefono || p.telefono || "",
    username: usuario.username || "",
  }), [usuario.id]); // Only recreate when usuario.id changes

  const handleSubmit = async (formValues) => {
    try {
      const payload = {
        nombre: formValues.nombre,
        apellido: formValues.apellido,
        email: formValues.email,
        habilitado: !!formValues.habilitado,
        categoria:
          formValues.categoria && formValues.categoria !== "Sin categoría"
            ? formValues.categoria
            : null,
      };

      await adminApi.users.update(formValues.id, payload);

      toast(
        <MiToast
          mensaje="Usuario actualizado correctamente."
          color="#10b981"
        />
      );

      navigate("/panel-control/usuarios");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e.message ||
        "Error al actualizar usuario";
      toast(<MiToast mensaje={msg} color="#ef4444" />);
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
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-4 border-b border-gray-700 pb-4 mb-6"
      >
        <button
          onClick={() => navigate("/panel-control/usuarios")}
          className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition"
        >
          <FiArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Editar Usuario</h2>
          <p className="text-gray-400 text-sm">
            Modificá los datos básicos y el estado del usuario.
          </p>
        </div>
      </motion.div>

      {/* Formulario */}
      <motion.div variants={itemVariants}>
        <UsuarioForm
          mode="edit"
          showAuthFields={false}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitText="Guardar cambios"
        />
      </motion.div>
    </motion.div>
  );
}
