import { useState, useEffect } from "react";
const BACKEND_URL = `http://${window.location.hostname}:8000`;

export const useUsuarios = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const limit = 10;
      const url = `${BACKEND_URL}/api/users_b/admin/users?page=${page}&limit=${limit}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!res.ok) throw new Error("Error al cargar usuarios");
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(Math.ceil(data.total / data.limit));
      setCurrentPage(data.page);
    } catch (err) {
      setError("Error al cargar usuarios");
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchUsers(newPage);
    }
  };

  // Puedes agregar editarUsuario y eliminarUsuario aquí si lo necesitas

  return {
    users, loading, error, currentPage, totalPages,
    fetchUsers, handlePageChange,
    // editarUsuario, eliminarUsuario
  };
};