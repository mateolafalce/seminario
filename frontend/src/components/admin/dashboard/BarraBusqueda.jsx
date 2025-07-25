import React, { useState } from 'react';
import Button from '../../common/Button/Button';

const BarraBusqueda = ({ onBuscar, onLimpiar, modoBusqueda, resultados, loading }) => {
  const [termino, setTermino] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onBuscar(termino);
  };

  const handleLimpiar = () => {
    setTermino('');
    onLimpiar();
  };

  return (
    <div className="space-y-6">
      {/* Formulario de búsqueda con el mismo estilo que BuscarCliente */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Buscar por nombre o usuario..."
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-[#E5FF00]"
        />
        <div className="flex gap-4">
          <Button
            type="submit"
            texto="Buscar"
            variant="default"
            disabled={loading}
          />
          {modoBusqueda && (
            <Button
              type="button"
              texto="Limpiar"
              onClick={handleLimpiar}
              variant="cancelar"
            />
          )}
        </div>
      </form>
      
      {/* Información de resultados */}
      {modoBusqueda && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-sm text-blue-400">
            <span className="font-semibold">Resultados para:</span> "{termino}" 
            <span className="ml-2 text-gray-300">({resultados.length} encontrados)</span>
          </div>
        </div>
      )}
      
      {!modoBusqueda && (
        <div className="bg-gray-800 mb-8">
        </div>
      )}
    </div>
  );
};

export default BarraBusqueda;