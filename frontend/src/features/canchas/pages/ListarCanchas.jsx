import { useEffect, useState, useCallback } from "react";
import backendClient from "../../../shared/services/backendClient";
import { FiEdit2, FiTrash2, FiSearch, FiAlertCircle } from "react-icons/fi";
import { PiCourtBasketballFill } from "react-icons/pi";
import { MdAccessTime } from "react-icons/md";

export default function ListarCanchas({ reloadKey = 0, onSeleccionar, onEliminar }) {
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
      setError(e?.response?.data?.detail || "Error al obtener la lista de canchas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCanchas(); }, [fetchCanchas, reloadKey]);

  const handleEditClick = (cancha, e) => { e.stopPropagation(); onSeleccionar?.(cancha); };
  const handleDeleteClick = async (cancha, e) => {
    e.stopPropagation();
    if (onEliminar) { onEliminar(cancha); return; }
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

  if (loading && canchas.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-slate-400 text-sm font-medium">Cargando canchas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      
      {/* HEADER DE TABLA (Simple count) */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
        <span className="text-sm font-medium text-slate-400">Resultados disponibles</span>
        <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700">
          {canchas.length} cancha{canchas.length !== 1 && 's'}
        </span>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-950/30 border-b border-red-900/30 flex items-center gap-2 text-red-400 text-sm">
          <FiAlertCircle /> {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Cancha</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 hidden sm:table-cell">Disponibilidad</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-transparent">
            {canchas.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-3">
                    <FiSearch size={24} className="text-slate-600"/>
                    <span>No hay canchas registradas.</span>
                  </div>
                </td>
              </tr>
            )}

            {canchas.map((cancha) => {
               const isHabilitado = cancha.habilitada ?? true;
               // Estilos condicionales idénticos a Reservas
               const statusClass = isHabilitado
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20";

               const countHorarios = Array.isArray(cancha.horarios) ? cancha.horarios.length : 0;

               return (
                <tr key={cancha.id || cancha._id} className="hover:bg-slate-800/40 transition-colors group relative">
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <PiCourtBasketballFill className="w-6 h-6 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 text-[15px]">{cancha.nombre}</span>
                        {cancha.descripcion && (
                          <span className="text-xs text-slate-500 max-w-[200px] truncate mt-0.5">{cancha.descripcion}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle text-center">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusClass}`}>
                      {isHabilitado ? 'Habilitada' : 'Mantenimiento'}
                    </span>
                  </td>

                  <td className="px-6 py-4 align-middle hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-slate-400">
                        <MdAccessTime />
                        <span className="text-xs font-medium">{countHorarios > 0 ? `${countHorarios} turnos activos` : 'Sin horarios'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-all">
                      <button onClick={(e) => handleEditClick(cancha, e)} className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors">
                        <FiEdit2 size={18} />
                      </button>
                      <button onClick={(e) => handleDeleteClick(cancha, e)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
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