import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IconoAvatar from '../../assets/icons/iconoAvatar';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Button from '../common/Button/Button';
import MiToast from '../common/Toast/MiToast';

// esta es una linea nueva que se uso para las ip y conectarse con el movil o cualquier dispositivo en la red
const BACKEND_URL = `http://${window.location.hostname}:8000`;
const categorias = ['2da','3ra','4ta', '5ta','6ta', '7ta', '8ta'];

function VerUsuarios({ show, onHide }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchUsers = async (page = 1) => {
    if (!show) return;

    setLoading(true);
    setError(null);

    try {
      const limit = 10;
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/users_b/admin/users?page=${page}&limit=${limit}`
        : `/api/users_b/admin/users?page=${page}&limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        const errorData = await response.json();
        console.error('Error fetching users:', errorData);
        setError(`Error al cargar usuarios: ${response.status}`);
        return;
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(Math.ceil(data.total / data.limit));
      setCurrentPage(data.page);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [show, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleModificarClick = (user) => {
    if (usuarioEditar && usuarioEditar.id === user.id) {
      setUsuarioEditar(null); // Si ya está abierto, lo cierra
    } else {
      setUsuarioEditar({
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        categoria: user.categoria || "Sin categoría",
        habilitado: user.habilitado,
      });
    }
  };

  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/users_b/modificar`
      : "/api/users_b/modificar";
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({
        identificador: usuarioEditar.id,
        nombre: usuarioEditar.nombre,
        apellido: usuarioEditar.apellido,
        email: usuarioEditar.email,
        categoria: usuarioEditar.categoria,
        habilitado: usuarioEditar.habilitado,
      }),
    });

    if (response.ok) {
      toast(
        <MiToast 
          mensaje="Usuario actualizado correctamente" 
          tipo="succes" 
        />
      );
      setUsuarioEditar(null);
      fetchUsers(currentPage); // Refrescar la lista
    } else {
      const errorData = await response.json();
      toast(
        <MiToast 
          mensaje={`Error al modificar: ${errorData.detail || 'Error desconocido'}`} 
          tipo="error" 
        />
      );
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
          {/* fondo borroso y oscuro copiado del mobile :D */}
          <motion.div
            className="absolute inset-0 bg-[#0D1B2A]/30 backdrop-blur-[0.375rem]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 20,
              duration: 0.32
            }}
            onClick={onHide}
          />
          {/* modal */}
          <motion.div
            className="relative bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl mx-4 border border-gray-700"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 24,
              delay: 0.08 
            }}
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
                  {users.map(user => (
                    <li key={user.id}>
                      <div className="flex bg-gray-700 rounded-2xl shadow p-4 items-center">
                        <IconoAvatar/>
                        <div className="flex-grow text-center">
                          <h5 className="text-base font-semibold text-white">{user.nombre} {user.apellido}</h5>
                          <h6 className="text-sm text-gray-300">@{user.username}</h6>
                          <p className={`text-xs font-bold ${user.habilitado ? 'text-green-400' : 'text-red-400'}`}>
                            {user.habilitado ? 'Habilitado' : 'No Habilitado'} - {user.categoria}
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
                              <input type="text" value={usuarioEditar.nombre} onChange={(e) => setUsuarioEditar({...usuarioEditar, nombre: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none" />
                              <input type="text" value={usuarioEditar.apellido} onChange={(e) => setUsuarioEditar({...usuarioEditar, apellido: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none" />
                              <input type="email" value={usuarioEditar.email} onChange={(e) => setUsuarioEditar({...usuarioEditar, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none" />
                              <select value={usuarioEditar.categoria} onChange={(e) => setUsuarioEditar({...usuarioEditar, categoria: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none">
                                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={usuarioEditar.habilitado} onChange={(e) => setUsuarioEditar({...usuarioEditar, habilitado: e.target.checked})} className="accent-[#E5FF00] w-4 h-4" />
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
              ) : (!loading && !error && (
                <p className="text-gray-300">No hay usuarios para mostrar.</p>
              ))}
            </div>
            <div className="px-8 py-4 border-t border-gray-700 flex justify-between items-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-white">
                Página {currentPage} de {totalPages}
              </span>
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