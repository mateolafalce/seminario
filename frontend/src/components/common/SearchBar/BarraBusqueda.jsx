import React, { useState } from 'react';
import Button from '../Button/Button';

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
    <div className="space-y-6 mb-4">
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full items-stretch sm:items-center">
        <input
          type="text"
          placeholder="Buscar por nombre o usuario..."
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-[#E5FF00]"
        />
        <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
          <Button
            type="submit"
            texto="Buscar"
            variant="default"
            disabled={loading}
            className="w-full sm:w-auto"
          />
          {modoBusqueda && (
            <Button
              type="button"
              texto="Limpiar"
              onClick={handleLimpiar}
              variant="cancelar"
              className="w-full sm:w-auto"
            />
          )}
        </div>
      </form>
      
      {!modoBusqueda && (
        <div className="bg-gray-800 mb-8">
        </div>
      )}
    </div>
  );
};

export default BarraBusqueda;