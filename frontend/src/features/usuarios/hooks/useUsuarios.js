import { useState, useEffect } from "react";
import adminApi from "../../../shared/services/adminApi";

// helpers de fecha
const pad = n => String(n).padStart(2, '0');
const oidToDate = (oid) => new Date(parseInt(oid.slice(0, 8), 16) * 1000);
const toAr = (d) => new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const formatAr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const normalizeUser = (u) => {
  const p = u.persona || {};
  const nombre   = p.nombre   ?? u.nombre   ?? '';
  const apellido = p.apellido ?? u.apellido ?? '';
  const email    = p.email    ?? u.email    ?? '';
  const dni      = p.dni      ?? u.dni      ?? '';

  const fecha =
    u.fecha_registro && String(u.fecha_registro).trim()
      ? u.fecha_registro
      : formatAr(toAr(oidToDate(u.id)));

  const categoria =
    (typeof u.categoria === 'string' && u.categoria.trim())
      ? u.categoria
      : (u.categoria_nombre && String(u.categoria_nombre).trim()
          ? String(u.categoria_nombre).trim()
          : 'Sin categoría');

  return {
    ...u,
    nombre,
    apellido,
    email,
    dni,
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
      const data = await adminApi.users.list(page, 10);
      const rows = (data.users || []).map(normalizeUser);

      // fallback si el back no manda total/limit/page
      const pageNum  = Number(data.page)  || page || 1;
      const limitNum = Number(data.limit) || 10;
      const totalNum = Number(data.total) || rows.length;

      setUsers(rows);
      setTotalPages(Math.max(1, Math.ceil(totalNum / limitNum)));
      setCurrentPage(pageNum);
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
