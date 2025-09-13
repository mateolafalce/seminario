import React, { useEffect, useState, useContext, memo, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import Modal from "../components/common/Modal/Modal";
import {
  FiUser,
  FiMail,
  FiShield,
  FiCalendar,
  FiClock,
  FiTag,
  FiEdit,
  FiArrowLeft,
  FiArrowRight,
  FiLoader as SpinnerIcon,
} from "react-icons/fi";

// Formato fecha/hora 24hs AR
const formatDateTime24h = (isoString) => {
  if (!isoString) return "Nunca";
  const date = new Date(isoString);
  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return date.toLocaleString("es-AR", options).replace(",", "");
};

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
    <article className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg shadow-inner transition-colors duration-200 hover:bg-slate-700/50">
      <div className="flex-shrink-0">{icons[icon]}</div>
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="text-lg font-semibold text-white break-words">{value}</p>
      </div>
    </article>
  );
});

const StarRating = ({ value = 0, size = "text-lg" }) => {
  const cl = `text-yellow-400 ${size}`;
  const stars = Array.from({ length: 5 }, (_, i) => (
    <span key={i} aria-hidden="true">
      {i < value ? "★" : "☆"}
    </span>
  ));
  return (
    <span className={cl} aria-label={`Valoración: ${value} de 5`}>
      {stars}
    </span>
  );
};

const ReviewCard = ({ r }) => (
  <li className="bg-gray-800/80 p-4 rounded-lg border border-gray-700 shadow">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
      <div className="flex items-center gap-2 text-white font-semibold">
        <FiUser />
        <span>
          {r?.autor?.nombre} {r?.autor?.apellido}
        </span>
        {r?.autor?.username && (
          <span className="text-gray-400 text-sm ml-2">@{r.autor.username}</span>
        )}
      </div>
      <span className="text-sm text-gray-400">
        {r?.fecha ? new Date(r.fecha).toLocaleDateString("es-AR") : ""}
      </span>
    </div>
    <StarRating value={r?.numero ?? 0} />
    {r?.observacion && <p className="text-gray-200 mt-2 italic">“{r.observacion}”</p>}
  </li>
);

const Pagination = ({ page, total, limit, onPrev, onNext }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex justify-between items-center mt-6">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="bg-[#eaff00] text-[#101a2a] px-4 py-2 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-yellow-300"
      >
        <FiArrowLeft className="inline-block mr-1" />
        Anterior
      </button>
      <span className="text-gray-300">
        Página {page} de {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="bg-[#eaff00] text-[#101a2a] px-4 py-2 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-yellow-300"
      >
        Siguiente
        <FiArrowRight className="inline-block ml-1" />
      </button>
    </div>
  );
};

const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-10 bg-slate-700/60 rounded w-2/3" />
    <div className="h-4 bg-slate-700/60 rounded w-1/2" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 bg-slate-700/60 rounded" />
      ))}
    </div>
  </div>
);

const ReviewsSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-24 bg-slate-700/60 rounded" />
    ))}
  </div>
);

function MisDatos() {
  const { apiFetch } = useContext(AuthContext);
  const [datos, setDatos] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "" });
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reseñas (idéntico a Jugadores.jsx)
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loadingResenias, setLoadingResenias] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingPerfil(true);
      try {
        const response = await apiFetch("/api/users_b/perfil");
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          setDatos(data);
        } else {
          toast.error("No se pudieron cargar los datos del perfil.");
        }
      } catch {
        toast.error("Error de red al cargar el perfil.");
      } finally {
        if (active) setLoadingPerfil(false);
      }
    })();
    return () => { active = false; };
  }, [apiFetch]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingResenias(true);
      try {
        const basePath = encodeURI("/api/users_b/reseñas/listar");
        const url = `${basePath}?page=${page}&limit=${limit}`;
        const response = await apiFetch(url);
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          const lista = data?.reseñas || data?.resenias || data?.results || data?.items || [];
          setReviews(Array.isArray(lista) ? lista : []);
          setTotalReviews(Number(data?.total) || lista.length || 0);
        } else {
          setReviews([]);
          setTotalReviews(0);
          toast.error("Error al obtener reseñas");
        }
      } catch {
        toast.error("Error al conectar con el servidor");
      } finally {
        if (active) setLoadingResenias(false);
      }
    })();
    return () => { active = false; };
  }, [apiFetch, page, limit]);

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

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalReviews / limit);
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1); // Reiniciar a la primera página al cambiar el límite
  };

  // --- No se muestra NADA mientras carga o si no hay datos (hasta que falle) ---
  if (loadingPerfil) {
    return null;
  }

  // --- Mensaje de error si la carga falló ---
  if (!datos)
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-900/20 p-8 rounded-lg">
        <FiShield className="w-12 h-12" />
        <p className="mt-4 text-lg font-semibold">Ocurrió un error</p>
        <p className="text-red-300">No se pudieron cargar los datos.</p>
      </div>
    );

  const totalPages = Math.ceil(totalReviews / limit);

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
            value={formatDateTime24h(datos.fecha_registro)}
          />
          <ProfileDataItem
            icon="clock"
            label="Última Conexión"
            value={formatDateTime24h(datos.ultima_conexion)}
          />
          <ProfileDataItem
            icon="tag"
            label="Categoría"
            value={datos.categoria}
          />
        </section>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Reseñas Recibidas
          </h2>

          {/* Selector de cantidad de reseñas por página */}
          <div className="mb-4">
            <label className="text-slate-200 text-sm font-semibold mb-2 block">
              Reseñas por página:
            </label>
            <select
              value={limit}
              onChange={handleLimitChange}
              className="bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#fdc700] focus:border-[#fdc700] transition-all duration-200"
            >
              {[5, 10, 15, 20].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <ul className="space-y-4">
            {reviews.length === 0 && (
              <li className="text-gray-400 text-center py-4">
                No hay reseñas para mostrar.
              </li>
            )}
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </ul>

          <Pagination
            page={page}
            total={totalReviews}
            limit={limit}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        </div>
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

      {/* Skeletons para carga */}
      {loadingPerfil && (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8">
          <ProfileSkeleton />
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Reseñas Recibidas
            </h2>
            <ReviewsSkeleton />
          </div>
        </div>
      )}
    </>
  );
}

export default MisDatos;