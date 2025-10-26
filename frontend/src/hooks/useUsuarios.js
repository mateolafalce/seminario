import { useState, useEffect } from "react";
import adminApi from "../services/adminApi";

// helpers de fecha
const pad = n => String(n).padStart(2, '0');
const oidToDate = (oid) => new Date(parseInt(oid.slice(0, 8), 16) * 1000);
const toAr = (d) => new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const formatAr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const normalizeUser = (u) => {
  const fecha =
    u.fecha_registro && String(u.fecha_registro).trim()
      ? u.fecha_registro
      : formatAr(toAr(oidToDate(u.id)));

  const categoria =
    typeof u.categoria === 'string' && u.categoria.trim()
      ? u.categoria
      : 'Sin categoría';

  return {
    ...u,
    fecha_registro: fecha,
    categoria,
    ultima_conexion: u.ultima_conexion || '',
  };
};

export function useUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.users.list(page, 10); // 👈 cookies + CSRF ya vienen de backendClient
      setUsers((data.users || []).map(normalizeUser));
      setTotalPages(Math.ceil(data.total / data.limit));
      setCurrentPage(data.page);
    } catch (e) {
      console.error("list users:", e);
      setError(e?.data?.detail || "Error al cargar usuarios");
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchUsers(newPage);
    }
  };

  const editarUsuario = async (u) => {
    try {
      const payload = {
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        habilitado: u.habilitado,
        categoria: u.categoria && u.categoria !== "Sin categoría" ? u.categoria : null,
      };
      await adminApi.users.update(u.id, payload);
      return { success: true };
    } catch (e) {
      console.error("update user:", e);
      return { success: false, error: e?.data?.detail || e.message || "Error al editar usuario" };
    }
  };

  const eliminarUsuario = async (id) => {
    try {
      await adminApi.users.remove(id);
      return { success: true };
    } catch (e) {
      console.error("delete user:", e);
      return { success: false, error: e?.data?.detail || e.message || "Error al eliminar usuario" };
    }
  };

  return {
    users, loading, error, currentPage, totalPages,
    fetchUsers, handlePageChange, editarUsuario, eliminarUsuario
  };
}
