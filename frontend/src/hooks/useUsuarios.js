import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

const BACKEND_URL = `http://${window.location.hostname}:8000`;

export const useUsuarios = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { logout } = useContext(AuthContext);

  const fetchUsers = async (page = 1) => {
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
          return;
        }
        const errorData = await response.json();
        setError(`Error al cargar usuarios: ${response.status}`);
        return;
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(Math.ceil(data.total / data.limit));
      setCurrentPage(data.page);
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const editarUsuario = async (usuarioData) => {
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/users_b/modificar`
      : "/api/users_b/modificar";
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          identificador: usuarioData.id,
          nombre: usuarioData.nombre,
          apellido: usuarioData.apellido,
          email: usuarioData.email,
          categoria: usuarioData.categoria,
          habilitado: usuarioData.habilitado,
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Error desconocido' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const eliminarUsuario = async (usuarioId) => {
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/users_b/eliminar`
      : "/api/users_b/eliminar";
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ identificador: usuarioId }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: 'No se pudo eliminar el usuario' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return {
    users,
    loading,
    error,
    currentPage,
    totalPages,
    setCurrentPage,
    fetchUsers,
    editarUsuario,
    eliminarUsuario,
    handlePageChange,
  };
};