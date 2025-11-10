import { useState, useEffect, useContext } from "react";
import backendClient from "../../../services/backendClient";
import { AuthContext } from "../../../context/AuthContext";
import ListarCanchas from "./ListarCanchas";
import CanchaForm from "../components/CanchaForm.jsx";
import Modal from "../../../components/common/Modal/Modal";
import MiToast from "../../../components/common/Toast/MiToast";
import { toast } from "react-toastify";
import MessageConfirm from "../../../components/common/Confirm/MessageConfirm"; // <-- tomado de B

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

  // Confirmación (tomado de B)
  const [confirmData, setConfirmData] = useState({ open: false, cancha: null });

  const fetchCanchas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await backendClient.get("canchas/listar");
      if (response) {
        setCanchas(response);
      } else {
        setError("Error al obtener canchas");
      }
    } catch (e) {
      setError(e.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanchas();
    // eslint-disable-next-line
  }, [refresh, canchasKey]);

  // === Eliminar: ahora abre modal de confirmación (como B), pero usa backendClient y rutas de A ===
  const handleEliminar = (cancha) => {
    setConfirmData({ open: true, cancha });
  };

  const cancelarEliminacion = () => {
    setConfirmData({ open: false, cancha: null });
  };

  const ejecutarEliminacion = async () => {
    const cancha = confirmData.cancha;
    if (!cancha) return;
    setConfirmData({ open: false, cancha: null });

    try {
      const response = await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      if (response) {
        toast(<MiToast mensaje={"Cancha eliminada exitosamente"} tipo="success" />);
        setCanchasKey((k) => k + 1); // refresca lista
      } else {
        toast(<MiToast mensaje={"No se pudo eliminar la cancha"} tipo="error" />);
      }
    } catch (e) {
      toast(<MiToast mensaje={e.message || "Error de conexión"} tipo="error" />);
    }
  };

  // === Editar: igual que A ===
  const handleEditar = (cancha) => {
    setCanchaEditar(cancha);
    setEditErrores({});
  };

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
        setCanchasKey((k) => k + 1);
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

      {/* Modal editar */}
      <Modal isOpen={!!canchaEditar} onClose={() => setCanchaEditar(null)}>
        {canchaEditar && (
          <div className="p-4">
            <h2 className="text-white text-lg font-semibold mb-3">Editar Cancha</h2>
            <CanchaForm
              initialValues={{ nombre: canchaEditar.nombre }}
              onSubmit={handleSubmitEditar}
              submitText="Guardar Cambios"
              loading={editLoading}
              erroresExternos={editErrores}
            />
          </div>
        )}
      </Modal>

      {confirmData.open && (
        <MessageConfirm
          mensaje={`¿Seguro que deseas eliminar la cancha "${confirmData.cancha?.nombre}"? Se borrarán todas sus reservas y datos asociados.`}
          onClose={cancelarEliminacion}
          onConfirm={ejecutarEliminacion}
          onCancel={cancelarEliminacion}
        />
      )}
    </div>
  );
}

export default VerCanchasInline;
