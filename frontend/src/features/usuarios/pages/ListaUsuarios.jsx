import { FiEdit2, FiTrash2, FiAlertCircle } from "react-icons/fi";
import { HiUsers } from "react-icons/hi";
import { MdLayers } from "react-icons/md";
import IconoAvatar from "../../../assets/icons/iconoAvatar";

const ListaUsuarios = ({ usuarios, loading, error, onEditar, onEliminar, modoBusqueda }) => {
  const usuariosMostrados = usuarios || [];

  const total = usuariosMostrados.length;
  const activos = usuariosMostrados.filter(
    (user) => (user?.habilitada ?? user?.habilitado ?? true)
  ).length;
  const inactivos = total - activos;

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-6 w-6 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-slate-400 text-sm">Cargando usuarios...</span>
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-red-400">
          <FiAlertCircle size={24} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      </div>
    );
  }

  // ---------- Sin resultados ----------
  if (!usuariosMostrados.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 flex items-center justify-center">
        <div className="text-center">
          <HiUsers className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-300 font-medium mb-1">Sin resultados</h3>
          <p className="text-slate-500 text-sm">
            No se encontraron usuarios con los filtros actuales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* HEADER DE LA TABLA */}
      <div className="px-6 py-4 border-b border-slate-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-950/30">
        <div>
          {modoBusqueda && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20 mb-2">
              Filtros activos
            </span>
          )}
          <div className="flex gap-4 text-xs font-medium text-slate-400">
            <span>{total} Total</span>
            <span className="text-emerald-500/80">{activos} Activos</span>
            {inactivos > 0 && (
              <span className="text-red-500/80">{inactivos} Inactivos</span>
            )}
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">DNI</th>
              <th className="px-6 py-4 hidden md:table-cell">Teléfono</th>
              <th className="px-6 py-4 hidden lg:table-cell">Registro</th>
              <th className="px-6 py-4 hidden lg:table-cell">Última conexión</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 hidden sm:table-cell">Categoría</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/50 bg-transparent">
            {usuariosMostrados.map((user) => {
              const p = user?.persona || {};

              const nombre =
                [user?.nombre, user?.apellido]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                [p?.nombre, p?.apellido]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                "—";

              const username = user?.username || "sin-usuario";
              const isHabilitado =
                user?.habilitada ?? user?.habilitado ?? true;

              const dni =
                user?.dni ??
                p?.dni ??
                "—";

              const email =
                user?.email ??
                p?.email ??
                "";

              const telefono =
                user?.telefono ??
                p?.telefono ??
                "";

              const categoria =
                (typeof user?.categoria === "string" &&
                  user.categoria.trim()) ||
                "Sin categoría";

              const statusClass = isHabilitado
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20";
              const dotClass = isHabilitado ? "bg-emerald-400" : "bg-red-400";

              return (
                <tr
                  key={user.id}
                  className="hover:bg-slate-800/40 transition-colors group relative"
                >
                  {/* Usuario */}
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                        <IconoAvatar className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 text-[15px]">
                          {nombre}
                        </span>
                        <span className="text-xs text-yellow-500/80 font-medium">
                          @{username}
                        </span>
                        {email && (
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            {email}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* DNI */}
                  <td className="px-6 py-4 align-middle text-slate-300 text-xs">
                    {dni || "—"}
                  </td>

                  {/* Teléfono */}
                  <td className="px-6 py-4 align-middle hidden md:table-cell text-slate-300 text-xs">
                    {telefono || <span className="text-slate-500">—</span>}
                  </td>

                  {/* Fecha de registro */}
                  <td className="px-6 py-4 align-middle hidden lg:table-cell text-slate-400 text-xs">
                    {user.fecha_registro || "—"}
                  </td>

                  {/* Última conexión */}
                  <td className="px-6 py-4 align-middle hidden lg:table-cell text-slate-400 text-xs">
                    {user.ultima_conexion || "—"}
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 align-middle text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                      {isHabilitado ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  {/* Categoría */}
                  <td className="px-6 py-4 align-middle hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-xs text-slate-300 border border-slate-700">
                      <MdLayers className="text-slate-500" />
                      {categoria}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => onEditar(user)}
                        className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => onEliminar(user)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaUsuarios;
