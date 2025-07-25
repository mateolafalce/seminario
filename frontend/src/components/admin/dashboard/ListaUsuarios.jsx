import React from 'react';
import Button from '../../common/Button/Button';
import IconoAvatar from '../../../assets/icons/iconoAvatar';

const ListaUsuarios = ({ usuarios, loading, error, onEditar, onEliminar, modoBusqueda }) => {
  if (loading) {
    return (
      <div className="max-h-[60vh] overflow-y-auto">
        <p className="text-gray-300">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-h-[60vh] overflow-y-auto">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!usuarios || usuarios.length === 0) {
    return (
      <div className="max-h-[60vh] overflow-y-auto">
        <p className="text-gray-300 text-center py-8">
          {modoBusqueda ? "No se encontraron usuarios con ese término." : "No hay usuarios para mostrar."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <ul className="space-y-4">
        {usuarios.map(user => (
          <li key={user.id}>
            <div className="flex bg-gray-700 rounded-2xl shadow p-4 items-center">
              <IconoAvatar/>
              <div className="flex-grow text-center">
                <h5 className="text-base font-semibold text-white">{user.nombre} {user.apellido}</h5>
                <h6 className="text-sm text-gray-300">@{user.username}</h6>
                <p className={`text-xs font-bold ${user.habilitado ? 'text-green-400' : 'text-red-400'}`}>
                  {user.habilitado ? 'Habilitado' : 'No Habilitado'} - {user.categoria || 'Sin categoría'}
                </p>
                {modoBusqueda && user.fecha_registro && (
                  <p className="text-xs text-gray-400 mt-1">
                    Registro: {user.fecha_registro} | Última conexión: {user.ultima_conexion || 'N/A'}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <Button
                  texto="Modificar"
                  onClick={() => onEditar(user)}
                  variant="modificar"
                />
                <Button
                  texto="Eliminar"
                  onClick={() => onEliminar(user)}
                  variant="eliminar"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ListaUsuarios;