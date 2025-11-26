import { useEffect, useState, memo } from "react";
import { toast } from "react-toastify";
import backendClient from "../../../shared/services/backendClient";
import Modal from "../../../shared/components/ui/Modal/Modal";
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

/* ------------------------------------------
   Utils
------------------------------------------- */

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

const classNames = (...c) => c.filter(Boolean).join(" ");

/* ------------------------------------------
   UI Pieces
------------------------------------------- */

const SectionTitle = ({ title, subtitle, right }) => (
  <div className="flex items-start sm:items-end justify-between gap-4">
    <div>
      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
      )}
    </div>
    {right}
  </div>
);

const Card = ({ children, className }) => (
  <div
    className={classNames(
      "rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.25)]",
      className
    )}
  >
    {children}
  </div>
);

const InfoRow = ({ icon, label, value, subtle }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/10 border border-amber-300/20">
      {icon}
    </div>
    <div className="min-w-0">
      <p className={classNames("text-xs uppercase tracking-wide", subtle ? "text-slate-400" : "text-slate-500")}>
        {label}
      </p>
      <p className="text-base font-semibold text-white truncate">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ active }) => (
  <span
    className={classNames(
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
      active
        ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30"
        : "bg-rose-500/10 text-rose-300 ring-rose-400/30"
    )}
  >
    <span
      className={classNames(
        "h-1.5 w-1.5 rounded-full",
        active ? "bg-emerald-400" : "bg-rose-400"
      )}
    />
    {active ? "Activo" : "Inactivo"}
  </span>
);

const StarRating = ({ value = 0 }) => (
  <div className="leading-none tracking-tight">
    <span className="text-amber-300 text-lg">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden="true">
          {i < value ? "★" : "☆"}
        </span>
      ))}
    </span>
    <span className="sr-only">{`Valoración: ${value} de 5`}</span>
  </div>
);

const ReviewCard = ({ r }) => (
  <Card className="p-4 sm:p-5">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300/40 to-yellow-400/20 ring-1 ring-white/10 flex items-center justify-center shrink-0">
          <FiUser className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold truncate">
            {r?.autor?.nombre} {r?.autor?.apellido}
          </p>
          {r?.autor?.username && (
            <p className="text-slate-400 text-sm truncate">@{r.autor.username}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StarRating value={r?.numero ?? 0} />
        <span className="text-xs text-slate-400">
          {r?.fecha ? new Date(r.fecha).toLocaleDateString("es-AR") : ""}
        </span>
      </div>
    </div>

    {r?.observacion && (
      <p className="text-slate-200 mt-3 italic leading-relaxed">
        “{r.observacion}”
      </p>
    )}
  </Card>
);

const Pagination = ({ page, total, limit, onPrev, onNext }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-3">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/10 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
      >
        <FiArrowLeft />
        Anterior
      </button>
      <span className="text-slate-300 text-sm">
        Página <span className="font-semibold">{page}</span> de{" "}
        <span className="font-semibold">{totalPages}</span>
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-200 disabled:opacity-40 transition-colors"
      >
        Siguiente
        <FiArrowRight />
      </button>
    </div>
  );
};

/* ------------------------------------------
   Skeletons
------------------------------------------- */

const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-32 rounded-2xl bg-slate-800/60" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-slate-800/60" />
      ))}
    </div>
  </div>
);

const ReviewsSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-24 rounded-xl bg-slate-800/60" />
    ))}
  </div>
);

/* ------------------------------------------
   Main Component
------------------------------------------- */

function MisDatos() {
  const [datos, setDatos] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "" });
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reseñas
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loadingResenias, setLoadingResenias] = useState(false);

  // PERFIL (GET)
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingPerfil(true);
      try {
        const data = await backendClient.get('users_b/perfil');
        if (!active) return;
        setDatos(data);
      } catch (e) {
        toast.error("Error de red al cargar el perfil.");
      } finally {
        if (active) setLoadingPerfil(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // RESEÑAS (GET)
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingResenias(true);
      try {
        const data = await backendClient.get('users_b/resenias/mias', { page, limit });
        if (!active) return;
        const lista = Array.isArray(data?.resenias) ? data.resenias : [];
        setReviews(lista);
        setTotalReviews(Number(data?.total) || lista.length || 0);
      } catch {
        setReviews([]);
        setTotalReviews(0);
        toast.error("Error al obtener reseñas");
      } finally {
        if (active) setLoadingResenias(false);
      }
    })();
    return () => { active = false; };
  }, [page, limit]);

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // EDITAR PERFIL (PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated = await backendClient.put('users_b/me/', form);
      toast.success("Datos actualizados correctamente");
      setDatos(prev => ({ ...prev, ...form })); // o usa `updated` si backend devuelve el perfil completo
      setIsModalOpen(false);
    } catch (err) {
      const msg = err?.data?.detail || err?.message || "Error al actualizar los datos";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevPage = () => setPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => {
    const totalPages = Math.max(1, Math.ceil(totalReviews / limit));
    setPage((p) => Math.min(p + 1, totalPages));
  };
  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  // Cargando o error
  if (loadingPerfil) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
        <ProfileSkeleton />
      </div>
    );
  }
  if (!datos) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-rose-300 bg-rose-900/10 p-8 rounded-2xl">
        <FiShield className="w-12 h-12" />
        <p className="mt-4 text-lg font-semibold">Ocurrió un error</p>
        <p className="text-rose-200">No se pudieron cargar los datos.</p>
      </div>
    );
  }

  const fullName = `${datos.nombre ?? ""} ${datos.apellido ?? ""}`.trim();

  return (
    <>
      {/* HEADER */}
      <div className="relative w-full overflow-hidden">
        <div className="w-full max-w-6xl mx-auto px-4 pt-8 md:pt-12 pb-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-400 p-[2px]">
              <div className="h-full w-full rounded-2xl bg-slate-900/90 flex items-center justify-center">
                <FiUser className="text-amber-300 h-8 w-8" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                ¡Hola, {datos.nombre}! <span className="align-middle">👋</span>
              </h1>
              <p className="text-slate-400 mt-1">
                Gestiona tu información personal y de tu cuenta.
              </p>
            </div>
      
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="w-full max-w-6xl mx-auto px-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-4 self-start">
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Usuario</p>
                  <h3 className="text-white font-bold text-xl">{fullName || "—"}</h3>
                </div>
                <StatusBadge active={!!datos.habilitado} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <InfoRow
                  icon={<FiUser className="text-amber-300" />}
                  label="Username"
                  value={datos.username || "—"}
                />
                <InfoRow
                  icon={<FiMail className="text-amber-300" />}
                  label="Email"
                  value={datos.email || "—"}
                />
                <InfoRow
                  icon={<FiCalendar className="text-amber-300" />}
                  label="Fecha de Registro"
                  value={formatDateTime24h(datos.fecha_registro)}
                />
                <InfoRow
                  icon={<FiClock className="text-amber-300" />}
                  label="Última Conexión"
                  value={formatDateTime24h(datos.ultima_conexion)}
                />
                <InfoRow
                  icon={<FiTag className="text-amber-300" />}
                  label="Categoría"
                  value={datos.categoria || "Sin categoría"}
                  subtle
                />
              </div>

              <button
                onClick={handleOpenEditModal}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/10 hover:bg-slate-700 transition"
              >
                <FiEdit />
                Editar Perfil
              </button>
            </Card>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Reseñas</p>
                <p className="mt-1 text-3xl font-extrabold text-white">
                  {totalReviews}
                </p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Promedio</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <StarRating
                    value={
                      reviews.length
                        ? Math.round(
                            (reviews.reduce((a, r) => a + (r?.numero ?? 0), 0) /
                              reviews.length) * 10
                          ) / 10
                        : 0
                    }
                  />
                </div>
              </Card>
            </div>
          </aside>

          {/* Main */}
          <main className="lg:col-span-7 xl:col-span-8 space-y-4">
            <SectionTitle
              title="Reseñas recibidas"
              subtitle="Lo que otros usuarios opinan sobre ti"
              right={
                <div className="flex flex-col md:flex-row items-center gap-2">
                  <label className="text-slate-400 text-xs">Por página</label>
                  <select
                    value={limit}
                    onChange={handleLimitChange}
                    className="rounded-lg bg-slate-900 text-white border border-white/10 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    {[5, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              }
            />

            {loadingResenias ? (
              <ReviewsSkeleton />
            ) : reviews.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-slate-300">
                  No hay reseñas para mostrar.
                </p>
              </Card>
            ) : (
              <ul className="space-y-4">
                {reviews.map((r, idx) => {
                  const itemKey =
                    r?._id ??
                    `${r?.autor?.id ?? r?.autor?.username ?? "anon"}-${r?.fecha ?? ""}-${idx}`;
                  return <ReviewCard key={itemKey} r={r} />;
                })}
              </ul>
            )}

            <Pagination
              page={page}
              total={totalReviews}
              limit={limit}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
            />
          </main>
        </div>
      </div>

      {/* Modal Editar */}
      <Modal
        title="Editar Mis Datos"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {["nombre", "apellido", "email"].map((field) => {
            const labels = { nombre: "Nombre", apellido: "Apellido", email: "Email" };
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
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-900 text-white border border-white/10 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    required
                    autoComplete="off"
                    placeholder={labels[field]}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex gap-3 mt-6 justify-end pt-4 border-t border-white/10">
            <button
              type="button"
              className="px-5 py-2 rounded-lg font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-colors disabled:opacity-50"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-extrabold bg-amber-300 text-slate-950 hover:bg-amber-200 transition-colors disabled:opacity-50"
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