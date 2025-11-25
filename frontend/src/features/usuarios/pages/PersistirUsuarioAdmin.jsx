import { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../shared/services/adminApi";
import UsuarioForm from "../components/UsuarioForm";
import { FiArrowLeft } from "react-icons/fi";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";

export default function PersistirUsuarioAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formValues) => {
    try {
      setLoading(true);

      // Aseguramos el shape que espera RegisterUser (backend)
      const payload = {
        nombre: formValues.nombre,
        apellido: formValues.apellido,
        email: formValues.email,
        dni: String(formValues.dni ?? "").trim(),
        username: formValues.username,
        password: formValues.password,
        habilitado: false, // Por defecto deshabilitado hasta confirmar email
        // cualquier otro campo extra (categoria, etc.)
        // es ignorado por Pydantic, así que no rompen nada
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
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e.message ||
        "Error al crear usuario";
      toast(<MiToast mensaje={msg} color="#ef4444" />);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-700 pb-4 mb-6">
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
      </div>

      {/* Formulario en modo CREAR */}
      <UsuarioForm
        mode="create"
        showAuthFields={true}
        onSubmit={handleSubmit}
        loading={loading}
        submitText="Crear Usuario"
      />
    </div>
  );
}