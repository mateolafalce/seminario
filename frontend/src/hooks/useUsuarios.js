import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// Hook personalizado para gestionar usuarios desde el backend.
// Incluye carga, paginación, edición y eliminación de usuarios.
const BACKEND_URL =
  window.location.hostname === "localhost"
    ? `http://${window.location.hostname}:8000`
    : ""; // En producción se usan rutas relativas

export function useUsuarios() {
  // Estados principales para la gestión de usuarios
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { logout } = useContext(AuthContext);

  // Obtiene la lista de usuarios desde el backend, con paginación
  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const limit = 10; // testesar despues tema disenio
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/users_b/admin/users?page=${page}&limit=${limit}`
        : `/api/users_b/admin/users?page=${page}&limit=${limit}`;
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

  // Carga inicial de usuarios al montar el hook
  useEffect(() => {
    fetchUsers();
  }, []);

  // Cambia de página en la paginación
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchUsers(newPage);
    }
  };

  // Edita un usuario en el backend
  const editarUsuario = async (usuarioData) => {
    try {
      const url = window.location.hostname === "localhost"
        ? `http://${window.location.hostname}:8000/api/users_b/${usuarioData.id}`
        : `/api/users_b/${usuarioData.id}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify({
          nombre: usuarioData.nombre,
          apellido: usuarioData.apellido,
          email: usuarioData.email,
          habilitado: usuarioData.habilitado,
          categoria: usuarioData.categoria,
        }),
      });
      if (response.status === 401) {
        logout();
        return { success: false, error: "Sesión expirada. Por favor inicia sesión nuevamente." };
      }
      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || "Error al editar usuario" };
      }
    } catch (error) {
      return { success: false, error: "Error de conexión" };
    }
  };

  // Elimina un usuario en el backend
  const eliminarUsuario = async (usuarioId) => {
    try {
      const url = window.location.hostname === "localhost"
        ? `http://${window.location.hostname}:8000/api/users_b/${usuarioId}`
        : `/api/users_b/${usuarioId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      });
      if (response.status === 401) {
        logout();
        return { success: false, error: "Sesión expirada. Por favor inicia sesión nuevamente." };
      }
      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || "Error al eliminar usuario" };
      }
    } catch (error) {
      return { success: false, error: "Error de conexión" };
    }
  };

  // Devuelve los estados y funciones principales del hook
  return {
    users, loading, error, currentPage, totalPages,
    fetchUsers, handlePageChange, editarUsuario, eliminarUsuario
  };
};