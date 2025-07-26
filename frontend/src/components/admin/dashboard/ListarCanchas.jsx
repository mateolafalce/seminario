import React from 'react'
import Button from '../../common/Button/Button'

const ListarCanchas = ({ canchas, loading, error, onEliminar, onEditar }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-base">Cargando canchas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-red-400 text-base">{error}</span>
      </div>
    )
  }

  if (!canchas.length) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-center text-base">
          No hay canchas para mostrar.
        </span>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto mt-6">
      <h2 className="text-xl font-semibold text-white mb-4">Canchas registradas</h2>
      <ul className="flex flex-col gap-3">
        {canchas.map((cancha) => (
          <li key={cancha.id} className="px-5 py-4 bg-gray-800/90 border border-gray-700 rounded-xl shadow-md flex items-center justify-between">
            <span className="text-base font-bold text-white">{cancha.nombre}</span>
            <div className="flex gap-2">
              <Button
                texto="Modificar"
                onClick={() => onEditar && onEditar(cancha)}
                variant="default"
                size="sm"
                className="px-4 py-1 text-xs rounded-lg font-medium"
              />
              <Button
                texto="Eliminar"
                onClick={() => onEliminar && onEliminar(cancha)}
                variant="cancelar"
                size="sm"
                className="px-4 py-1 text-xs rounded-lg font-medium"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ListarCanchas