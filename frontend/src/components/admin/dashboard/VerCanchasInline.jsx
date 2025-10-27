import React, { useState, useEffect, useContext } from "react";
import { createApi } from "../../../utils/api";
import { AuthContext } from "../../../context/AuthContext";
import ListarCanchas from "./ListarCanchas";
import EditarCanchaModal from "./EditarCanchaModal";
import Modal from "../../common/Modal/Modal";
import MiToast from "../../common/Toast/MiToast";
import { toast } from "react-toastify";
import MessageConfirm from "../../common/Confirm/MessageConfirm";

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
  const [confirmData, setConfirmData] = useState({open: false, cancha:null});

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

  // solo abre el modal
  const handleEliminar = async (cancha) => {
    setConfirmData({open: true, cancha: cancha});
  };


  // cierra el modal
  const cancelarEliminacion = () => {
    setConfirmData({open: false, cancha: null});
  }

  // lógica para borrar la cancha
  const ejecuarEliminación = async() => {
    const cancha = confirmData.cancha;
    if (!cancha) return;

    setConfirmData ({open: false, cancha: null});

    try {
      const response = await apiFetch(`/api/canchas/eliminar/${cancha.id}`,{
        method: 'DELETE',
      });

      const d = await (async (r) => {try {return await r.json();} catch {return {}; } })(response);

      if (response.ok){
        toast(
          <MiToast
            mensaje={d.msg || "Cancha eliminada exitosamente"}
            tipo="success"
          />
        );
        setCanchasKey(k => k + 1);
      } else {
        toast(
          <MiToast
          mensaje={e.message || "Error de conexión"}
          tipo="error"
          />
        );
      }
    }catch (e){
      toast(
        <MiToast
        mensaje={e.message || "Error de conexión"}
        tipo = "error"
        />
      );
    }
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

      {confirmData.open && (
        <MessageConfirm
        mensaje = {`¿Seguro que deseas eliminar la cancha "${confirmData.cancha?.nombre}"? Se borraran todas sus reservas y datos asociados.`}
        onClose={cancelarEliminacion}
        onConfirm={ejecuarEliminación}
        onCancel={cancelarEliminacion}
        />
      )}
    </div>
  );
}

export default VerCanchasInline;
