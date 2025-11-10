import React from 'react';

const Paginacion = ({ currentPage, totalPages, onPageChange, loading }) => {
  return (
    <div className="flex justify-between items-center bg-gray-800 rounded-xl p-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || loading}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500"
      >
        Anterior
      </button>
      
      <span className="text-white">
        Página {currentPage} de {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || loading}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500"
      >
        Siguiente
      </button>
    </div>
  );
};

export default Paginacion;