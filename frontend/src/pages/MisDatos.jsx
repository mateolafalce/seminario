import React, { useEffect, useState, useContext, memo } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import Modal from "../components/common/Modal/Modal";
import Loader from "../components/common/Loader/Loader"; // 1. Importa el nuevo Loader
import {
  FiUser,
  FiMail,
  FiShield,
  FiCalendar,
  FiClock,
  FiTag,
  FiEdit,
  FiLoader as SpinnerIcon, // Renombra FiLoader para evitar conflictos
} from "react-icons/fi";

// Componente memoizado para performance
const ProfileDataItem = memo(({ icon, label, value }) => {
  const icons = {
    user: <FiUser className="w-6 h-6 text-yellow-400" />,
    mail: <FiMail className="w-6 h-6 text-yellow-400" />,
    shieldCheck: <FiShield className="w-6 h-6 text-yellow-400" />,
    calendar: <FiCalendar className="w-6 h-6 text-yellow-400" />,
    clock: <FiClock className="w-6 h-6 text-yellow-400" />,
    tag: <FiTag className="w-6 h-6 text-yellow-400" />,
  };

  return (
    <article className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg shadow-inner transition-all duration-300 hover:bg-slate-700/50">
      <div className="flex-shrink-0">{icons[icon]}</div>
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </article>
  );
});

function MisDatos() {
  const { apiFetch } = useContext(AuthContext);
  const [datos, setDatos] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPerfil = async () => {
      // Simula un pequeño retraso para que el loader sea visible
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const response = await apiFetch("/api/users_b/perfil");
        if (response.ok) {
          const data = await response.json();
          setDatos(data);
        } else {
          toast.error("No se pudieron cargar los datos del perfil.");
        }
      } catch (error) {
        toast.error("Error de red al cargar el perfil.");
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, [apiFetch]);

  const handleOpenEditModal = () => {
    if (datos) {
      setForm({
        nombre: datos.nombre || "",
        apellido: datos.apellido || "",
        email: datos.email || "",
      });
      setIsModalOpen(true);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await apiFetch("/api/users_b/me/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setDatos(updatedData);
        toast.success("Datos actualizados correctamente");
        setIsModalOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Error al actualizar los datos");
      }
    } catch (error) {
      toast.error("Error de red al actualizar los datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Usa el nuevo Loader aquí
  if (loading) {
    return <Loader texto="Cargando tu perfil..." />;
  }

  if (!datos)
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-900/20 p-8 rounded-lg">
        <FiShield className="w-12 h-12" />
        <p className="mt-4 text-lg font-semibold">Ocurrió un error</p>
        <p className="text-red-300">No se pudieron cargar los datos.</p>
      </div>
    );

  return (
    <>
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              ¡Hola, {datos.nombre}! 👋
            </h1>
            <p className="mt-1 text-slate-400">
              Gestiona tu información personal y de tu cuenta.
            </p>
          </div>
          <button
            onClick={handleOpenEditModal}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-yellow-300 transition-all transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-yellow-400"
          >
            <FiEdit className="w-5 h-5" />
            Editar Perfil
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileDataItem
            icon="user"
            label="Nombre Completo"
            value={`${datos.nombre} ${datos.apellido}`}
          />
          <ProfileDataItem icon="mail" label="Email" value={datos.email} />
          <ProfileDataItem
            icon="user"
            label="Username"
            value={datos.username}
          />
          <ProfileDataItem
            icon="shieldCheck"
            label="Estado"
            value={datos.habilitado ? "Activo" : "Inactivo"}
          />
          <ProfileDataItem
            icon="calendar"
            label="Fecha de Registro"
            value={new Date(datos.fecha_registro).toLocaleDateString()}
          />
          <ProfileDataItem
            icon="clock"
            label="Última Conexión"
            value={
              datos.ultima_conexion
                ? new Date(datos.ultima_conexion).toLocaleString()
                : "Nunca"
            }
          />
          <ProfileDataItem
            icon="tag"
            label="Categoría"
            value={datos.categoria}
          />
        </section>
      </div>

      <Modal
        title="Editar Mis Datos"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {["nombre", "apellido", "email"].map((field) => {
            const labels = {
              nombre: "Nombre",
              apellido: "Apellido",
              email: "Email",
            };
            const types = { nombre: "text", apellido: "text", email: "email" };
            const icons = {
              nombre: <FiUser className="w-5 h-5 text-slate-400" />,
              apellido: <FiUser className="w-5 h-5 text-slate-400" />,
              email: <FiMail className="w-5 h-5 text-slate-400" />,
            };
            return (
              <div key={field}>
                <label
                  htmlFor={field}
                  className="block text-sm font-semibold text-slate-200 mb-1"
                >
                  {labels[field]}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    {icons[field]}
                  </span>
                  <input
                    id={field}
                    type={types[field]}
                    name={field}
                    value={form[field]}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fdc700] focus:border-[#fdc700] transition-all duration-200"
                    required
                    autoComplete="off"
                    placeholder={labels[field]}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex gap-3 mt-6 justify-end pt-4 border-t border-slate-700">
            <button
              type="button"
              className="px-5 py-2 rounded-lg font-semibold bg-slate-600 text-white hover:bg-slate-500 transition-colors disabled:opacity-50"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold bg-[#fdc700] text-[#0D1B2A] hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting && <SpinnerIcon className="w-5 h-5 animate-spin" />}
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default MisDatos;
