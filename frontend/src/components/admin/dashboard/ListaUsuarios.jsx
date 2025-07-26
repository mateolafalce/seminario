import React from 'react';
import Button from '../../common/Button/Button';
import IconoAvatar from '../../../assets/icons/iconoAvatar';

const ListaUsuarios = ({ usuarios, loading, error, onEditar, onEliminar, modoBusqueda }) => {
  // Mostrar todos los usuarios recibidos (la paginación la controla el hook o backend)
  const usuariosMostrados = usuarios || [];

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

  if (!usuariosMostrados || usuariosMostrados.length === 0) {
    return (
      <div className="max-h-[60vh] overflow-y-auto">
        <p className="text-gray-300 text-center py-8">
          {modoBusqueda ? "No se encontraron usuarios con ese término." : "No hay usuarios para mostrar."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[45vh] mb-6 overflow-y-auto">
      <ul className="space-y-2">
        {usuariosMostrados.map(user => (
          <li key={user.id}>
            <div className="flex bg-gray-700 rounded-xl shadow p-2 items-center">
              <IconoAvatar className="w-8 h-8" />
              <div className="flex-grow text-center">
                <h5 className="text-sm font-semibold text-white">{user.nombre} {user.apellido}</h5>
                <h6 className="text-xs text-gray-300">@{user.username}</h6>
                <p className={`text-xs font-bold ${user.habilitado ? 'text-green-400' : 'text-red-400'}`}>
                  {user.habilitado ? 'Habilitado' : 'No Habilitado'} - {user.categoria || 'Sin categoría'}
                </p>
                {modoBusqueda && user.fecha_registro && (
                  <p className="text-xs text-gray-400 mt-1">
                    Registro: {user.fecha_registro} | Última conexión: {user.ultima_conexion || 'N/A'}
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-2 flex-shrink-0">
                <Button
                  texto="Modificar"
                  onClick={() => onEditar(user)}
                  variant="modificar"
                  size="sm"
                  className="px-2 py-1 text-xs"
                />
                <Button
                  texto="Eliminar"
                  onClick={() => onEliminar(user)}
                  variant="eliminar"
                  size="sm"
                  className="px-2 py-1 text-xs"
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