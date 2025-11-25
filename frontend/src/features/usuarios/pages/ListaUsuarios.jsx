// frontend/src/features/usuarios/pages/ListaUsuarios.jsx
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { HiUsers } from "react-icons/hi";
import { MdLayers } from "react-icons/md";
import IconoAvatar from '../../../assets/icons/iconoAvatar';

const ListaUsuarios = ({ usuarios, loading, error, onEditar, onEliminar, modoBusqueda }) => {
  const usuariosMostrados = usuarios || [];

  const total = usuariosMostrados.length;
  const activos = usuariosMostrados.filter((user) => {
    const isHabilitado = user?.habilitada ?? user?.habilitado ?? true;
    return !!isHabilitado;
  }).length;
  const inactivos = total - activos;

  // Loading
  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-12 flex items-center justify-center">
        <span className="text-gray-400 text-sm animate-pulse">
          Cargando usuarios...
        </span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <span className="text-red-400 text-sm font-medium">{error}</span>
          <p className="text-xs text-red-300/80">
            Intenta actualizar la página o ajustar los filtros.
          </p>
        </div>
      </div>
    );
  }

  // Empty
  if (!usuariosMostrados.length) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-12 flex items-center justify-center">
        <div className="text-center">
          <HiUsers className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <span className="text-gray-400 text-sm">
            Sin resultados para los filtros aplicados.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-slate-600/50">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-slate-700/70 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center">
            <HiUsers className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              {modoBusqueda ? 'Resultados de búsqueda' : 'Usuarios Registrados'}
              {modoBusqueda && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-gray-300 border border-slate-700/80">
                  Filtros activos
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {modoBusqueda
                ? 'Mostrando usuarios según los criterios de búsqueda aplicados.'
                : 'Listado principal de cuentas registradas en el sistema.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
          <span className="px-3 py-1 rounded-full bg-slate-800 text-[11px] font-medium text-gray-300 border border-slate-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            {total} usuarios
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-[11px] font-medium text-emerald-400 border border-emerald-500/25">
            {activos} activos
          </span>
          {inactivos > 0 && (
            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-[11px] font-medium text-rose-400 border border-rose-500/25">
              {inactivos} inactivos
            </span>
          )}
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <table className="min-w-full text-sm text-gray-200">
          <thead className="bg-slate-800/90 text-xs uppercase text-gray-400 font-semibold tracking-wider border-b border-slate-700/70">
            <tr>
              <th className="px-6 py-3 text-left">Usuario</th>
              <th className="px-6 py-3 text-center">Estado</th>
              <th className="px-6 py-3 text-left hidden sm:table-cell">Categoría</th>
              <th className="px-6 py-3 text-left hidden lg:table-cell">Contacto</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-transparent">
            {usuariosMostrados.map((user) => {
              const p = user?.persona || {};
              const nombre = [p?.nombre, p?.apellido].filter(Boolean).join(' ').trim() || '—';
              const username = user?.username || 'sin-usuario';

              const isHabilitado = user?.habilitada ?? user?.habilitada ?? true;
              const statusClass = isHabilitado
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : "bg-rose-500/10 text-rose-400 border-rose-500/25";
              const statusDotClass = isHabilitado ? "bg-emerald-400" : "bg-rose-400";

              return (
                <tr
                  key={user.id}
                  className="hover:bg-slate-800/40 transition-colors group relative"
                >
                  {/* Usuario */}
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 p-0.5 shadow-sm">
                        <IconoAvatar className="w-full h-full text-slate-400 p-1" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-[15px]">
                          {nombre}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs">
                          <span className="text-yellow-500/90 font-medium">
                            @{username}
                          </span>
                          {p?.email && (
                            <span className="text-gray-500 hidden sm:inline-block truncate max-w-[220px]" title={p.email}>
                              · {p.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 align-middle text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                      {isHabilitado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Categoría */}
                  <td className="px-6 py-4 align-middle hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 text-xs text-gray-300 border border-slate-700/80">
                      <MdLayers className="w-3.5 h-3.5 text-slate-400" />
                      {user.categoria || 'Sin categoría'}
                    </span>
                  </td>

                  {/* Contacto */}
                  <td className="px-6 py-4 align-middle hidden lg:table-cell">
                    <div className="flex flex-col gap-1">
                      {p?.email && (
                        <span
                          className="text-gray-300 font-medium truncate max-w-[260px]"
                          title={p.email}
                        >
                          {p.email}
                        </span>
                      )}
                      {p?.telefono && (
                        <span className="text-xs text-gray-500">
                          {p.telefono}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => onEditar(user)}
                        className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg"
                        aria-label="Editar usuario"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => onEliminar(user)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                        aria-label="Eliminar usuario"
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
