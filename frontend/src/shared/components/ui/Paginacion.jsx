import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const Paginacion = ({ currentPage, totalPages, onPageChange, loading }) => {
  if (!totalPages || totalPages <= 1) return null;

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const handleChange = (page) => {
    if (loading) return;
    if (page < 1 || page > totalPages) return;
    if (page === currentPage) return; // seguridad extra
    onPageChange(page);
  };

  // ---- Cálculo de páginas a mostrar ----
  const maxButtons = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);

  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  const pages = [];
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  const PageButton = ({ page, active }) => {
    const disabled = loading || active;

    return (
      <button
        type="button"
        onClick={() => !disabled && handleChange(page)}
        disabled={disabled}
        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors
          ${
            active
              ? "bg-yellow-400 text-slate-900 shadow-sm cursor-default pointer-events-none"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          }`}
      >
        {page}
      </button>
    );
  };

  return (
    <div className="mt-6 flex justify-center">
      <div className="flex flex-col items-center gap-1.5">
        {/* Barra principal */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-800 rounded-full shadow-sm backdrop-blur">
          {/* Anterior con icono */}
          <button
            type="button"
            aria-label="Página anterior"
            onClick={() => handleChange(currentPage - 1)}
            disabled={isFirstPage || loading}
            className="px-2 sm:px-3 h-8 sm:h-9 inline-flex items-center justify-center rounded-full text-xs sm:text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FiChevronLeft size={18} />
          </button>

          {/* Números de página */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {start > 1 && (
              <>
                <PageButton page={1} active={currentPage === 1} />
                {start > 2 && (
                  <span className="px-1 text-slate-500 text-xs sm:text-sm">
                    …
                  </span>
                )}
              </>
            )}

            {pages.map((page) => (
              <PageButton
                key={page}
                page={page}
                active={page === currentPage}
              />
            ))}

            {end < totalPages && (
              <>
                {end < totalPages - 1 && (
                  <span className="px-1 text-slate-500 text-xs sm:text-sm">
                    …
                  </span>
                )}
                <PageButton
                  page={totalPages}
                  active={currentPage === totalPages}
                />
              </>
            )}
          </div>

          {/* Siguiente con icono */}
          <button
            type="button"
            aria-label="Página siguiente"
            onClick={() => handleChange(currentPage + 1)}
            disabled={isLastPage || loading}
            className="px-2 sm:px-3 h-8 sm:h-9 inline-flex items-center justify-center rounded-full text-xs sm:text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FiChevronRight size={18} />
          </button>
        </div>

        {/* Texto auxiliar */}
        <span className="text-[11px] text-slate-500">
          Página {currentPage} de {totalPages}
        </span>
      </div>
    </div>
  );
};

export default Paginacion;
