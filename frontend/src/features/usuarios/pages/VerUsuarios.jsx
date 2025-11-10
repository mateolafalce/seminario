import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IconoAvatar from '../../../assets/icons/iconoAvatar';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import Button from '../../../components/common/Button/Button';
import MiToast from '../../../components/common/Toast/MiToast';
import { toast } from 'react-toastify';

import backendClient from '../../../services/backendClient';
import useCategorias from '../../../hooks/useCategorias';

function VerUsuarios({ show, onHide }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const { categorias, nombres: categoriasNombres, loading: loadingCategorias } = useCategorias();

  const limit = 10;

  const fetchUsers = async (page = 1) => {
    if (!show) return;

    setLoading(true);
    setError(null);

    try {
      const data = await backendClient.get(`users_b/admin/users?page=${page}&limit=${limit}`);
      setUsers(data.users || []);
      setTotalPages(Math.ceil((data.total || 0) / (data.limit || limit)));
      setCurrentPage(data.page || page);
    } catch (err) {
      if (err?.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      setError(`Error al cargar usuarios${err?.status ? `: ${err.status}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const catDisplay = (cat) => (typeof cat === 'string' && cat.trim() ? cat : 'Sin categoría');

  const handleModificarClick = (user) => {
    if (usuarioEditar && usuarioEditar.id === user.id) {
      setUsuarioEditar(null);
    } else {
      setUsuarioEditar({
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email || '',
        // guardamos el "nombre" de categoría o vacío
        categoria: typeof user.categoria === 'string' && user.categoria.trim() ? user.categoria : '',
        habilitado: !!user.habilitado,
      });
    }
  };

  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    if (!usuarioEditar) return;

    try {
      await backendClient.post('users_b/modificar', {
        identificador: usuarioEditar.id,
        nombre: usuarioEditar.nombre,
        apellido: usuarioEditar.apellido,
        email: usuarioEditar.email,
        // backend acepta nombre o vacío/null -> si está '', backend lo limpia a None
        categoria: usuarioEditar.categoria,
        habilitado: usuarioEditar.habilitado,
      });

      toast(<MiToast mensaje="Usuario actualizado correctamente" tipo="succes" />);
      setUsuarioEditar(null);
      fetchUsers(currentPage);
    } catch (err) {
      const msg = err?.data?.detail || 'Error desconocido';
      toast(<MiToast mensaje={`Error al modificar: ${msg}`} tipo="error" />);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* overlay */}
          <motion.div
            className="absolute inset-0 bg-[#0D1B2A]/30 backdrop-blur-[0.375rem]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, duration: 0.32 }}
            onClick={onHide}
          />
          {/* modal */}
          <motion.div
            className="relative bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl mx-4 border border-gray-700"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 }}
          >
            <div className="flex items-center justify-between border-b border-gray-700 px-8 py-6">
              <h5 className="text-2xl font-bold text-white">Lista de Usuarios</h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-200 text-3xl font-bold focus:outline-none"
                aria-label="Close"
                onClick={onHide}
              >
                ×
              </button>
            </div>

            <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
              {loading && <p className="text-gray-300">Cargando usuarios...</p>}
              {error && <p className="text-red-400">{error}</p>}
              {!loading && !error && users.length > 0 ? (
                <ul className="space-y-4">
                  {users.map((user) => (
                    <li key={user.id}>
                      <div className="flex bg-gray-700 rounded-2xl shadow p-4 items-center">
                        <IconoAvatar />
                        <div className="flex-grow text-center">
                          <h5 className="text-base font-semibold text-white">
                            {user.nombre} {user.apellido}
                          </h5>
                          <h6 className="text-sm text-gray-300">@{user.username}</h6>
                          {user.email && (
                            <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {user.email}
                            </p>
                          )}
                          <p className={`text-xs font-bold ${user.habilitado ? 'text-green-400' : 'text-red-400'}`}>
                            {user.habilitado ? 'Habilitado' : 'No Habilitado'} - {catDisplay(user.categoria)}
                          </p>
                        </div>

                        <Button
                          texto="Modificar"
                          onClick={() => handleModificarClick(user)}
                          variant="modificar"
                          className="ml-4 flex-shrink-0"
                        />
                      </div>

                      {usuarioEditar && usuarioEditar.id === user.id && (
                        <div className="mt-4 bg-gray-900 rounded-xl p-4 border border-gray-700">
                          <form onSubmit={handleEditarSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={usuarioEditar.nombre}
                                onChange={(e) => setUsuarioEditar({ ...usuarioEditar, nombre: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                                placeholder="Nombre"
                                required
                              />
                              <input
                                type="text"
                                value={usuarioEditar.apellido}
                                onChange={(e) => setUsuarioEditar({ ...usuarioEditar, apellido: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                                placeholder="Apellido"
                                required
                              />
                              <input
                                type="email"
                                value={usuarioEditar.email}
                                onChange={(e) => setUsuarioEditar({ ...usuarioEditar, email: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                                placeholder="Email"
                                required
                              />

                              {/* Categoría dinámica */}
                              <select
                                value={usuarioEditar.categoria}
                                onChange={(e) => setUsuarioEditar({ ...usuarioEditar, categoria: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                              >
                                <option value="">{loadingCategorias ? 'Cargando…' : 'Sin categoría'}</option>
                                {categoriasNombres.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={usuarioEditar.habilitado}
                                onChange={(e) => setUsuarioEditar({ ...usuarioEditar, habilitado: e.target.checked })}
                                className="accent-[#E5FF00] w-4 h-4"
                              />
                              <label className="text-white text-sm">Usuario habilitado</label>
                            </div>

                            <div className="flex gap-2 mt-2">
                              <Button type="submit" texto="Guardar" variant="default" />
                              <Button type="button" texto="Cancelar" onClick={() => setUsuarioEditar(null)} variant="cancelar" />
                            </div>
                          </form>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                !loading && !error && <p className="text-gray-300">No hay usuarios para mostrar.</p>
              )}
            </div>

            <div className="px-8 py-4 border-t border-gray-700 flex justify-between items-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-white">Página {currentPage} de {totalPages}</span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VerUsuarios;
