import { useEffect, useState, useCallback } from "react";
import backendClient from "../../../shared/services/backendClient";

// Iconos
import { FiEdit2, FiTrash2, FiSearch, FiAlertCircle } from "react-icons/fi";
import { PiCourtBasketballFill } from "react-icons/pi";
import { MdAccessTime } from "react-icons/md";

export default function ListarCanchas({
  reloadKey = 0,
  onSeleccionar,
  onEliminar,
}) {
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCanchas = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await backendClient.get("canchas/listar");
      setCanchas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error al obtener canchas", e);
      const msg =
        e?.response?.data?.detail || "Error al obtener la lista de canchas.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCanchas();
  }, [fetchCanchas, reloadKey]);

  // Manejadores de acción
  const handleEditClick = (cancha, e) => {
    e.stopPropagation();
    onSeleccionar?.(cancha);
  };

  const handleDeleteClick = async (cancha, e) => {
    e.stopPropagation();
    if (onEliminar) {
      onEliminar(cancha);
      return;
    }
    if (!window.confirm(`¿Seguro que querés eliminar "${cancha.nombre}"?`)) return;

    try {
      setLoading(true);
      await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      await fetchCanchas();
    } catch (err) {
      setError(err?.response?.data?.detail || "Error al eliminar.");
      setLoading(false);
    }
  };

  // --- Renderizado de Carga ---
  if (loading && canchas.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-400 text-sm font-medium">Cargando canchas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-slate-600/50">
      
      {/* Encabezado */}
      <div className="px-6 py-4 border-b border-slate-700/70 flex items-center justify-between bg-slate-800/30 backdrop-blur-sm">
        <div>
           <h3 className="text-base font-bold text-white tracking-wide">
             Listado de Canchas
           </h3>
           <p className="text-xs text-gray-500 mt-0.5">Espacios deportivos disponibles</p>
        </div>
        
        <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-gray-300 border border-slate-700">
          {canchas.length} cancha{canchas.length !== 1 && 's'}
        </span>
      </div>

      {/* Mensaje de error al borrar */}
      {error && (
        <div className="px-6 py-3 bg-red-950/30 border-b border-red-900/30 flex items-center gap-2 text-red-400 text-sm">
          <FiAlertCircle /> {error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <table className="min-w-full text-sm text-gray-200">
          <thead className="bg-slate-800/90 text-xs uppercase text-gray-400 font-semibold tracking-wider border-b border-slate-700/70">
            <tr>
              <th className="px-6 py-3 text-left">Cancha</th>
              <th className="px-6 py-3 text-center">Estado</th>
              <th className="px-6 py-3 text-left hidden sm:table-cell">Disponibilidad</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-transparent">
            {canchas.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <FiSearch size={24} className="text-gray-600"/>
                    <span>No hay canchas registradas.</span>
                  </div>
                </td>
              </tr>
            )}

            {canchas.map((cancha) => {
               const isHabilitado = cancha.habilitada ?? true;
               const statusClass = isHabilitado
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-[0_0_10px_rgba(244,63,94,0.1)]";

               const countHorarios = Array.isArray(cancha.horarios) ? cancha.horarios.length : 0;

               return (
                <tr
                  key={cancha.id || cancha._id}
                  className="hover:bg-slate-800/40 transition-colors group relative cursor-default"
                >
                  {/* Columna: Info Cancha */}
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-4">
                      {/* SOLO ICONO (Sin imagen rota) */}
                      <div className="flex-shrink-0 relative">
                         <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 p-0.5 shadow-sm overflow-hidden flex items-center justify-center">
                            <PiCourtBasketballFill className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                         </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-[15px] leading-tight">
                          {cancha.nombre}
                        </span>
                        {cancha.descripcion && (
                          <span className="text-xs text-gray-500 max-w-[200px] truncate mt-0.5">
                            {cancha.descripcion}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Columna: Estado */}
                  <td className="px-6 py-4 align-middle text-center">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                      {isHabilitado ? 'Habilitada' : 'Mantenimiento'}
                    </span>
                  </td>

                  {/* Columna: Horarios */}
                  <td className="px-6 py-4 align-middle hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-gray-400">
                        <MdAccessTime className="text-slate-500" />
                        <span className="text-xs font-medium">
                            {countHorarios > 0 ? `${countHorarios} turnos activos` : 'Sin horarios'}
                        </span>
                    </div>
                  </td>

                  {/* Columna: Acciones */}
                  <td className="px-6 py-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                      
                      <button
                        onClick={(e) => handleEditClick(cancha, e)}
                        className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400/50 active:scale-95"
                        title="Editar cancha"
                      >
                        <FiEdit2 size={18} />
                      </button>

                      <button
                        onClick={(e) => handleDeleteClick(cancha, e)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 active:scale-95"
                        title="Eliminar cancha"
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
}