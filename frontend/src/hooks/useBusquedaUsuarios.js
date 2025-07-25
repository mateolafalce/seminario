import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const BACKEND_URL =
  window.location.hostname === "localhost"
    ? `http://${window.location.hostname}:8000`
    : ""; // vacío para producción

export const useBusquedaUsuarios = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modoBusqueda, setModoBusqueda] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const { logout } = useContext(AuthContext);

  const buscar = async (termino) => {
    if (!termino.trim()) {
      limpiar();
      return;
    }

    setLoading(true);
    setError(null);
    setModoBusqueda(true);
    setTerminoBusqueda(termino);

    try {
      const url = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/users_b/buscar`
        : `/api/users_b/buscar`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ nombre: termino.trim() }),
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const usuariosAdaptados = (data.clientes || data || []).map(cliente => ({
          id: cliente._id || cliente.id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          username: cliente.username,
          email: cliente.email,
          categoria: cliente.categoria,
          habilitado: cliente.habilitado,
          fecha_registro: cliente.fecha_registro,
          ultima_conexion: cliente.ultima_conexion
        }));
        setResultados(usuariosAdaptados);
      } else {
        setError("Error en la búsqueda");
        setResultados([]);
      }
    } catch (err) {
      setError("Error de conexión");
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
    setResultados(prev => prev.filter(u => u.id !== usuarioId));
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