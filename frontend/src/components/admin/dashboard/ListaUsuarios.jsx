import React from 'react';
import Button from '../../common/Button/Button';
import IconoAvatar from '../../../assets/icons/iconoAvatar';

// Lista de usuarios con acciones de editar y eliminar
const ListaUsuarios = ({
  usuarios,
  loading,
  error,
  onEditar,
  onEliminar,
  modoBusqueda
}) => {
  const usuariosMostrados = usuarios || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-base">Cargando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-red-400 text-base">{error}</span>
      </div>
    );
  }

  if (!usuariosMostrados.length) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-center text-base">
          {modoBusqueda
            ? "No se encontraron usuarios con ese término."
            : "No hay usuarios para mostrar."}
        </span>
      </div>
    );
  }

  return (
    <div className="max-h-[54vh] pb-4 overflow-y-auto">
      <ul className="flex flex-col gap-3">
        {usuariosMostrados.map((user) => (
          <li key={user.id}>
            <div className="
              flex items-center px-5 py-4
              bg-gray-800/90 border border-gray-700 rounded-xl shadow-md
              hover:bg-gray-700/90 transition
            ">
              {/* Avatar del usuario */}
              <div className="mr-4 flex-shrink-0">
                <IconoAvatar className="w-10 h-10 text-yellow-300" />
              </div>

              {/* Información principal */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-white truncate">
                    {user.nombre} {user.apellido}
                  </span>
                  <span className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-semibold border
                    ${user.habilitado
                      ? "bg-green-700/20 text-green-300 border-green-700"
                      : "bg-red-700/20 text-red-300 border-red-700"
                    }
                  `}>
                    {user.habilitado ? "Habilitado" : "No Habilitado"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>@{user.username}</span>
                  {user.categoria && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      {user.categoria}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-500 items-center">
                  {user.fecha_registro && (
                    <span className="flex items-center gap-1">
                      {/* Fecha de registro */}
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                      </svg>
                      <span>
                        <span className="font-semibold text-gray-400">Registro:</span> {user.fecha_registro}
                      </span>
                    </span>
                  )}
                  {user.ultima_conexion && (
                    <span className="flex items-center gap-1">
                      {/* Última conexión */}
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-6a9 9 0 1 1-18 0a9 9 0 0 1 18 0z" />
                      </svg>
                      <span>
                        <span className="font-semibold text-gray-400">Última vez:</span> {user.ultima_conexion}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de editar / eliminar (luego remplazar por iconos?) */}
              <div className="flex flex-col gap-2 ml-4">
                <Button
                  texto="Modificar"
                  onClick={() => onEditar(user)}
                  variant="default"
                  size="sm"
                  className="px-4 py-1 text-xs rounded-lg font-medium hover:bg-yellow-300 hover:text-gray-900 transition"
                />
                <Button
                  texto="Eliminar"
                  onClick={() => onEliminar(user)}
                  variant="cancelar"
                  size="sm"
                  className="px-4 py-1 text-xs rounded-lg font-medium"
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
