import React, { useEffect, useState, useCallback } from "react";
import backendClient from "../../../shared/services/backendClient";

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

  const handleClickRow = (cancha) => {
    onSeleccionar?.(cancha);
  };

  const handleClickEliminar = async (cancha, e) => {
    e.stopPropagation();
    if (onEliminar) {
      onEliminar(cancha);
      return;
    }

    // fallback por si algún día se usa este componente solo
    if (
      !window.confirm(
        `¿Seguro que querés eliminar la cancha "${cancha.nombre}"?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      await fetchCanchas();
    } catch (err) {
      console.error("Error eliminando cancha", err);
      const msg =
        err?.response?.data?.detail ||
        "Error al eliminar la cancha. Intentalo de nuevo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl shadow-md overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/70 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Canchas</h3>
        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">
            Cargando...
          </span>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-400 bg-red-950/40 border-b border-red-800/40">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-200">
          <thead className="bg-slate-800/80 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Cancha</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Horarios asignados</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {canchas.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-gray-500 text-sm"
                >
                  No hay canchas cargadas todavía.
                </td>
              </tr>
            )}

            {canchas.map((cancha) => (
              <tr
                key={cancha.id || cancha._id}
                onClick={() => handleClickRow(cancha)}
                className="border-t border-slate-800/60 hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-gray-100">
                    {cancha.nombre}
                  </div>
                  {cancha.descripcion && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {cancha.descripcion}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      cancha.habilitada
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        cancha.habilitada ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    {cancha.habilitada ? "Habilitada" : "Deshabilitada"}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-xs text-gray-300">
                  {Array.isArray(cancha.horarios) && cancha.horarios.length > 0
                    ? `${cancha.horarios.length} horario(s) asignado(s)`
                    : "Sin horarios asignados"}
                </td>

                <td className="px-4 py-3 align-top text-right">
                  <button
                    type="button"
                    onClick={(e) => handleClickEliminar(cancha, e)}
                    className="inline-flex items-center rounded-lg border border-red-500/60 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
