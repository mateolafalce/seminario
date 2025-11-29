import { useState, useContext } from 'react';
import { AuthContext } from '../../auth/context/AuthContext';
import adminApi from '../../../shared/services/adminApi';

export const useBusquedaUsuarios = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modoBusqueda, setModoBusqueda] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const { logout } = useContext(AuthContext);

  const buscar = async (termino) => {
    const term = termino?.trim() || '';
    if (!term) { limpiar(); return; }

    setLoading(true);
    setError(null);
    setModoBusqueda(true);
    setTerminoBusqueda(term);

    try {
      const data = await adminApi.users.search(term); // cookies + CSRF
      const list = data?.clientes || data?.users || data || [];

      const usuariosAdaptados = list.map((c) => {
        const p = c.persona || {};

        const nombre   = p.nombre   ?? c.nombre   ?? '';
        const apellido = p.apellido ?? c.apellido ?? '';
        const email    = p.email    ?? c.email    ?? '';
        const dni      = p.dni      ?? c.dni      ?? '';

        const categoria =
          (typeof c.categoria === 'string' && c.categoria.trim())
            ? c.categoria
            : (c.categoria_nombre && String(c.categoria_nombre).trim()
                ? String(c.categoria_nombre).trim()
                : 'Sin categoría');

        return {
          ...c,
          id: c._id || c.id,
          persona: p,
          nombre,
          apellido,
          email,
          dni,
          categoria,
          habilitado: c.habilitado,
          fecha_registro: c.fecha_registro,
          ultima_conexion: c.ultima_conexion,
        };
      });

      setResultados(usuariosAdaptados);
    } catch (e) {
      if (e.status === 401) logout();
      setError(e?.message || 'Error en la búsqueda');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setResultados([]);
    setModoBusqueda(false);
    setError(null);
    setTerminoBusqueda('');
  };

  const eliminarDeResultados = (usuarioId) => {
    setResultados((prev) => prev.filter((u) => (u.id || u._id) !== usuarioId));
  };

  return {
    resultados,
    loading,
    error,
    modoBusqueda,
    terminoBusqueda,
    buscar,
    limpiar,
    eliminarDeResultados,
  };
};
