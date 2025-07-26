import React, { useState, useEffect, useContext } from "react";
import { createApi } from "../../../utils/api";
import { AuthContext } from "../../../context/AuthContext";
import ListarCanchas from "./ListarCanchas";
import EditarCanchaModal from "./EditarCanchaModal";
import Modal from "../../common/Modal/Modal";

function VerCanchasInline({ refresh }) {
  const { handleUnauthorized } = useContext(AuthContext);
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canchasKey, setCanchasKey] = useState(0);

  // Estado para editar
  const [canchaEditar, setCanchaEditar] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editErrores, setEditErrores] = useState({});

  const apiFetch = createApi(handleUnauthorized);

  const fetchCanchas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/canchas/listar');
      if (response.ok) {
        const data = await response.json();
        setCanchas(data);
      } else {
        const err = await response.json();
        setError(err.detail || 'Error al obtener canchas');
      }
    } catch (e) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanchas();
    // eslint-disable-next-line
  }, [refresh, canchasKey]);

  // Handler para eliminar cancha
  const handleEliminar = async (cancha) => {
    if (!window.confirm(`¿Eliminar la cancha "${cancha.nombre}"?`)) return;
    try {
      const response = await apiFetch(`/api/canchas/eliminar/${cancha.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setCanchasKey(k => k + 1); // Refresca la lista
      } else {
        const err = await response.json();
        alert(err.detail || "No se pudo eliminar la cancha");
      }
    } catch (e) {
      alert(e.message || "Error de conexión");
    }
  };

  // Handler para abrir modal de editar
  const handleEditar = (cancha) => {
    setCanchaEditar(cancha);
    setEditErrores({});
  };

  // Handler para submit de edición
  const handleSubmitEditar = async (valores) => {
    setEditErrores({});
    if (!valores.nombre || !valores.nombre.trim()) {
      setEditErrores({ nombre: "El nombre es obligatorio" });
      return;
    }
    setEditLoading(true);
    try {
      const response = await apiFetch(`/api/canchas/modificar/${canchaEditar.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: valores.nombre.trim() }),
      });
      if (response.ok) {
        setCanchaEditar(null);
        setCanchasKey(k => k + 1);
      } else {
        const err = await response.json();
        setEditErrores({ general: err.detail || "No se pudo modificar la cancha" });
      }
    } catch (e) {
      setEditErrores({ general: e.message || "Error de conexión" });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div>
      <ListarCanchas
        key={canchasKey}
        canchas={canchas}
        loading={loading}
        error={error}
        onEliminar={handleEliminar}
        onEditar={handleEditar}
      />
      <Modal isOpen={!!canchaEditar} onClose={() => setCanchaEditar(null)}>
        {canchaEditar && (
          <EditarCanchaModal
            cancha={canchaEditar}
            onClose={() => setCanchaEditar(null)}
            onSubmit={handleSubmitEditar}
            loading={editLoading}
            errores={editErrores}
          />
        )}
      </Modal>
    </div>
  );
}

export default VerCanchasInline;