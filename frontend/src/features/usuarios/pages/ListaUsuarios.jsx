import React from 'react'
import Button from '../../../shared/components/ui/Button/Button'
import IconoAvatar from '../../../assets/icons/iconoAvatar'

const ListaUsuarios = ({
  usuarios,
  loading,
  error,
  onEditar,
  onEliminar,
  modoBusqueda
}) => {
  const usuariosMostrados = usuarios || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-base">Cargando...</span>
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

  if (!usuariosMostrados.length) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-center text-base">
          {modoBusqueda
            ? 'No se encontraron usuarios con ese término.'
            : 'No hay usuarios para mostrar.'}
        </span>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <ul className="flex flex-col gap-3">
        {usuariosMostrados.map((user) => {
          const p = user?.persona || {};
          const nombre = [p?.nombre ?? user?.nombre, p?.apellido ?? user?.apellido]
            .filter(Boolean)
            .join(' ')
            .trim() || '—';
          const username = user?.username ? `@${user.username}` : '—';
          const email = (p?.email ?? user?.email) || '—';
          const dni   = (p?.dni   ?? user?.dni)   || '—';

          // categoría: admití nombre directo o null
          const categoria =
            (typeof user?.categoria === 'string' && user.categoria.trim())
              ? user.categoria
              : (user?.categoria_nombre || 'Sin categoría');

          const fechaRegistro = user?.fecha_registro || '—';
          const ultimaConexion = user?.ultima_conexion || '—';

          return (
            <li key={user.id}>
              <div
                className="
                flex items-center px-5 py-4
                bg-gray-800/90 border border-gray-700 rounded-xl shadow-md
                hover:bg-gray-700/90 transition
              "
              >
                {/* Avatar */}
                <div className="mr-4 flex-shrink-0">
                  <IconoAvatar className="w-10 h-10 text-yellow-300" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-white truncate">
                      {nombre}
                    </span>

                    <span
                      className={`
                        ml-1 px-2 py-0.5 rounded-full text-xs font-semibold border
                        ${
                          user.habilitado
                            ? 'bg-green-700/20 text-green-300 border-green-700'
                            : 'bg-red-700/20 text-red-300 border-red-700'
                        }
                      `}
                    >
                      {user.habilitado ? 'Habilitado' : 'No Habilitado'}
                    </span>
                  </div>

                  {/* username + email + DNI + categoría */}
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{username}</span>

                    {email !== '—' && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {email}
                      </span>
                    )}

                    {dni !== '—' && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                        DNI: {dni}
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      {categoria}
                    </span>
                  </div>

                  {/* Registro / Última vez */}
                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-500 items-center">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 7V3m8 4V3m-9 8h10m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
                        />
                      </svg>
                      <span>
                        <span className="font-semibold text-gray-400">
                          Registro:
                        </span>{' '}
                        {fechaRegistro}
                      </span>
                    </span>

                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-6a9 9 0 1 1-18 0a9 9 0 0 1 18 0z"
                        />
                      </svg>
                      <span>
                        <span className="font-semibold text-gray-400">
                          Última vez:
                        </span>{' '}
                        {ultimaConexion}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Acciones */}
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
          )
        })}
      </ul>
    </div>
  )
}

export default ListaUsuarios
