import React, { useState, useEffect, useContext } from "react";
import backendClient from "../../../services/backendClient";
import { AuthContext } from "../../../context/AuthContext";
import ListarCanchas from "./ListarCanchas";
import EditarCanchaModal from "./EditarCanchaModal";
import Modal from "../../common/Modal/Modal";
import MiToast from "../../common/Toast/MiToast";
import { toast } from "react-toastify";

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

  const fetchCanchas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await backendClient.get('canchas/listar');
      if (response) {
        setCanchas(response);
      } else {
        setError('Error al obtener canchas');
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
      const response = await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      if (response) {
        setCanchasKey(k => k + 1); // Refresca la lista
      } else {
        toast(
          <MiToast 
            mensaje={"No se pudo eliminar la cancha"} 
            tipo="error" 
          />
        );
      }
    } catch (e) {
      toast(
        <MiToast 
          mensaje={e.message || "Error de conexión"} 
          tipo="error" 
        />
      );
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
      const response = await backendClient.put(`canchas/modificar/${canchaEditar.id}`, {
        nombre: valores.nombre.trim(),
      });
      if (response) {
        setCanchaEditar(null);
        setCanchasKey(k => k + 1);
      } else {
        setEditErrores({ general: "No se pudo modificar la cancha" });
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