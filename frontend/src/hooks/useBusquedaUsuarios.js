import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const BACKEND_URL =
  window.location.hostname === "localhost"
    ? `http://${window.location.hostname}:8000`
    : ""; 

// Hook para buscar usuarios por nombre o username luego dni??
export const useBusquedaUsuarios = () => {
  const [resultados, setResultados] = useState([]); // Resultados de la búsqueda
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Error de búsqueda
  const [modoBusqueda, setModoBusqueda] = useState(false); // Si está en modo búsqueda
  const [terminoBusqueda, setTerminoBusqueda] = useState(''); // Término actual
  const { logout } = useContext(AuthContext);

  // Realiza la búsqueda de usuarios
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
        // Adapta los datos recibidos al formato esperado
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

  // Limpia los resultados y el estado de búsqueda
  const limpiar = () => {
    setResultados([]);
    setModoBusqueda(false);
    setError(null);
    setTerminoBusqueda('');
  };

  // Elimina un usuario de los resultados de búsqueda
  const eliminarDeResultados = (usuarioId) => {
    setResultados(prev => prev.filter(u => u.id !== usuarioId));
  };

  // Exporta estados y funciones principales
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