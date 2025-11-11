import { useState } from 'react';
import Button from "../Button/Button";

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
    <div className="mb-2">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full items-stretch sm:items-center"
        role="search"
        aria-label="Buscar usuarios"
      >
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o usuario…"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 pr-24 pl-10 py-2 text-slate-100 placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-amber-300"
            aria-label="Término de búsqueda"
          />
          {/* Icono lupa */}
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          {/* “Clear” y loading a la derecha dentro del input */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {loading && (
              <svg className="h-5 w-5 animate-spin text-slate-300" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            )}
            {modoBusqueda && !!termino && (
              <button
                type="button"
                onClick={handleLimpiar}
                className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                aria-label="Limpiar búsqueda"
                title="Limpiar"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <Button type="submit" texto="Buscar" variant="default" disabled={loading} className="w-full sm:w-auto"/>
          {modoBusqueda && (
            <Button type="button" texto="Restablecer" onClick={handleLimpiar} variant="cancelar" className="w-full sm:w-auto"/>
          )}
        </div>
      </form>
    </div>
  );
};

export default BarraBusqueda;
