import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IconoAvatar from '../../assets/icons/iconoAvatar';

function VerUsuarios({ show, onHide }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!show) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('http://127.0.0.1:8000/admin/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error fetching users:', errorData);
          setError(`Error al cargar usuarios: ${response.status}`);
          return;
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Error de conexión al servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [show]);

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
                      <div className="flex bg-gray-700 rounded-2xl shadow p-4">
                        <IconoAvatar/>
                        <div className="flex flex-col justify-center w-full text-center">
                          <h5 className="text-lg font-semibold text-white">{user.nombre} {user.apellido}</h5>
                          <p className="text-gray-400 text-base">Información acerca del jugador</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (!loading && !error && (
                <p className="text-gray-300">No hay usuarios para mostrar.</p>
              ))}
            </div>
            <div className="px-8 py-4 border-t border-gray-700 flex justify-end">
              {/* se podrian agregaar botones por aca*/}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VerUsuarios;