
import { useState } from "react";
import backendClient from "../../../../shared/services/backendClient";
import Modal from "../../../../shared/components/ui/Modal/Modal";
import Button from "../../../../shared/components/ui/Button/Button";
import CanchaForm from "../../../canchas/components/CanchaForm";
import ListarCanchas from "../../../canchas/pages/ListarCanchas";

export default function GestionCanchas() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [canchaEditar, setCanchaEditar] = useState(null);
  const [mensajeError, setMensajeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const abrirModalCrear = () => {
    setCanchaEditar(null);
    setMensajeError("");
    setModalAbierto(true);
  };

  const abrirModalEditar = (cancha) => {
    setCanchaEditar(cancha);
    setMensajeError("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setCanchaEditar(null);
    setMensajeError("");
    setModalAbierto(false);
  };

  const handleCreate = async (valores) => {
    try {
      setLoading(true);
      setMensajeError("");

      const payload = {
        nombre: valores.nombre.trim(),
        descripcion: (valores.descripcion || "").trim(),
        imagen_url: (valores.imagen_url || "").trim(),
        habilitada: valores.habilitada ?? true,
      };

      await backendClient.post("canchas/crear", payload);

      setReloadKey((k) => k + 1);
      setModalAbierto(false);
    } catch (e) {
      const msg =
        e?.response?.data?.detail || "Error al crear la cancha. Intentalo de nuevo.";
      setMensajeError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEditar = async (valores) => {
    if (!canchaEditar?.id) return;

    try {
      setLoading(true);
      setMensajeError("");

      const payload = {
        nombre: valores.nombre.trim(),
        descripcion: (valores.descripcion || "").trim(),
        imagen_url: (valores.imagen_url || "").trim(),
        habilitada: valores.habilitada ?? true,
      };

      await backendClient.put(`canchas/modificar/${canchaEditar.id}`, payload);

      setReloadKey((k) => k + 1);
      setModalAbierto(false);
      setCanchaEditar(null);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        "Error al actualizar la cancha. Intentalo de nuevo.";
      setMensajeError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCancha = async (cancha) => {
    if (
      !window.confirm(
        `¿Seguro que querés eliminar la cancha "${cancha.nombre}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setMensajeError("");
      await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      setReloadKey((k) => k + 1);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        "Error al eliminar la cancha. Verificá que no tenga reservas asociadas.";
      setMensajeError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 👇 calculamos initialValues una sola vez por render (pero lo importante es la key)
  const initialFormValues = canchaEditar
    ? {
        nombre: canchaEditar.nombre ?? "",
        descripcion: canchaEditar.descripcion ?? "",
        imagen_url: canchaEditar.imagen_url ?? "",
        habilitada:
          typeof canchaEditar.habilitada === "boolean"
            ? canchaEditar.habilitada
            : true,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">Gestión de canchas</h2>
          <p className="text-sm text-gray-400">
            Creá, editá y administrá las canchas disponibles para reservas.
          </p>
        </div>

        <Button
          variant="crear"
          size="pill"
          onClick={abrirModalCrear}
          disabled={loading}
        >
          Crear cancha
        </Button>
      </div>

      <ListarCanchas
        reloadKey={reloadKey}
        onSeleccionar={abrirModalEditar}
        onEliminar={handleEliminarCancha}
      />

      <Modal isOpen={modalAbierto} onClose={cerrarModal}>
        <div className="p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {canchaEditar ? "Editar cancha" : "Crear cancha"}
          </h3>

          {mensajeError && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
              {mensajeError}
            </p>
          )}

          <CanchaForm
            // 👇 esto hace que el form se "resetee" sólo cuando cambiás de cancha / modo
            key={canchaEditar ? canchaEditar.id : "new"}
            initialValues={initialFormValues}
            onSubmit={canchaEditar ? handleSubmitEditar : handleCreate}
            submitText={canchaEditar ? "Guardar cambios" : "Crear cancha"}
            loading={loading}
          />
        </div>
      </Modal>
    </div>
  );
}
