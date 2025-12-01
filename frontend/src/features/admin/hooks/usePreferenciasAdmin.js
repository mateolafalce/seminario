import { useState, useEffect } from "react";
import adminApi from "../../../shared/services/adminApi";

/**
 * Hook para listar preferencias en el panel admin con paginación.
 * Usa POST /preferencias/admin/buscar
 */
export function usePreferenciasAdmin(initialFilters = {}) {
  const [preferencias, setPreferencias] = useState([]);
  const [filtros, setFiltros] = useState(initialFilters);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [limit] = useState(10); // cantidad por página (podés hacerlo configurable)

  const fetchPreferencias = async (page = 1, overrideFilters = null) => {
    setLoading(true);
    setError(null);

    try {
      const toSend = overrideFilters ?? filtros ?? {};
      const resp = await adminApi.preferencias.adminSearch(toSend, page, limit);

      const rows = resp?.preferencias || [];
      const totalNum = Number(resp?.total ?? rows.length);
      const limitNum = Number(resp?.limit ?? limit);
      const pageNum = Number(resp?.page ?? page);

      setPreferencias(rows);
      setCurrentPage(pageNum);
      setTotalPages(Math.max(1, Math.ceil(totalNum / limitNum)));
    } catch (e) {
      console.error("admin preferencias:", e);
      setError(e?.data?.detail || e?.message || "Error al cargar preferencias");
      setPreferencias([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Cargar primera página al montar
  useEffect(() => {
    fetchPreferencias(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchPreferencias(newPage);
  };

  const applyFilters = (newFilters) => {
    setFiltros(newFilters);
    // Siempre que cambio filtros, vuelvo a la página 1
    fetchPreferencias(1, newFilters);
  };

  const refetch = () => fetchPreferencias(currentPage);

  return {
    preferencias,
    filtros,
    loading,
    error,
    currentPage,
    totalPages,
    limit,
    handlePageChange,
    applyFilters,
    refetch,
  };
}
