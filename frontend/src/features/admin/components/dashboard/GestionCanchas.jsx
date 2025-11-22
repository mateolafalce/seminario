import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

// CORRECCIÓN: 4 niveles arriba para llegar a 'src/shared'
import backendClient from "../../../../shared/services/backendClient";

// CORRECCIÓN: 3 niveles arriba para llegar a 'src/features/canchas'
import ListarCanchas from "../../../canchas/pages/ListarCanchas";
import CanchaForm from "../../../canchas/components/CanchaForm";

// CORRECCIÓN: 4 niveles arriba para llegar a 'src/shared'
import Modal from "../../../../shared/components/ui/Modal/Modal";
import MiToast from "../../../../shared/components/ui/Toast/MiToast";
import MessageConfirm from "../../../../shared/components/ui/Confirm/MessageConfirm";
import Button from "../../../../shared/components/ui/Button/Button";

export default function GestionCanchas() {
  // === ESTADOS GENERALES ===
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 🆕 Horarios disponibles globales (para armar la lista por cancha)
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);

  // === ESTADOS MODALES ===
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canchaEditar, setCanchaEditar] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, cancha: null });

  // === ESTADOS DE CARGA EN FORMULARIOS ===
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // 1. CARGAR CANCHAS
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

  // 1.b CARGAR HORARIOS DISPONIBLES (una vez)
  const fetchHorarios = async () => {
    try {
      const data = await backendClient.get("horarios/listar");
      // esperamos [{id, hora}, ...]
      setHorariosDisponibles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error al cargar horarios", e);
      setHorariosDisponibles([]);
    }
  };

  useEffect(() => {
    fetchCanchas();
  }, [refreshKey]);

  useEffect(() => {
    fetchHorarios();
  }, []);

  // 2. CREAR CANCHA
  const handleCreate = async (valores) => {
    setFormErrors({});
    const nombre = valores.nombre?.trim();
    if (!nombre) {
      setFormErrors({ nombre: "El nombre es obligatorio" });
      return;
    }

    const horarios = Array.isArray(valores.horarios) ? valores.horarios : [];

    setCreating(true);
    try {
      const response = await backendClient.post("canchas/crear", {
        nombre,
        horarios,
      });
      if (response) {
        toast(<MiToast mensaje="Cancha creada exitosamente" tipo="success" />);
        setShowCreateModal(false);
        setRefreshKey((k) => k + 1);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Error al crear";
      setFormErrors({ general: msg });
      toast(<MiToast mensaje={msg} tipo="error" />);
    } finally {
      setCreating(false);
    }
  };

  // 3. EDITAR CANCHA
  const handleEditarClick = (cancha) => {
    setCanchaEditar(cancha);
    setFormErrors({});
  };

  const handleSubmitEditar = async (valores) => {
    setFormErrors({});
    const nombre = valores.nombre?.trim();
    if (!nombre) {
      setFormErrors({ nombre: "El nombre es obligatorio" });
      return;
    }

    const horarios = Array.isArray(valores.horarios) ? valores.horarios : [];

    setEditing(true);
    try {
      const response = await backendClient.put(`canchas/modificar/${canchaEditar.id}`, {
        nombre,
        horarios,
      });
      if (response) {
        toast(<MiToast mensaje="Cancha modificada correctamente" tipo="success" />);
        setCanchaEditar(null);
        setRefreshKey((k) => k + 1);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Error al modificar";
      setFormErrors({ general: msg });
      toast(<MiToast mensaje={msg} tipo="error" />);
    } finally {
      setEditing(false);
    }
  };

  // 4. ELIMINAR CANCHA
  const handleEliminarClick = (cancha) => {
    setConfirmDelete({ open: true, cancha });
  };

  const ejecutarEliminacion = async () => {
    const { cancha } = confirmDelete;
    if (!cancha) return;
    setConfirmDelete({ open: false, cancha: null });

    try {
      const response = await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      if (response) {
        toast(<MiToast mensaje="Cancha eliminada exitosamente" tipo="success" />);
        setRefreshKey((k) => k + 1);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || "No se pudo eliminar la cancha";
      toast(<MiToast mensaje={msg} tipo="error" />);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* HEADER CON BOTÓN DE CREAR */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border-l-4 border-[#E5FF00] shadow-md">
        <div>
          <h2 className="text-white font-bold text-xl">Gestión de Canchas</h2>
          <p className="text-gray-400 text-sm">Administra las canchas del sistema</p>
        </div>
        <Button
          texto="+ Nueva cancha"
          onClick={() => setShowCreateModal(true)}
          variant="crear"
          size="pill"
        />
      </div>

      {/* LISTADO */}
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <ListarCanchas
          canchas={canchas}
          loading={loading}
          error={error}
          onEliminar={handleEliminarClick}
          onEditar={handleEditarClick}
        />
      </div>

      {/* MODAL CREAR */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <div className="p-4">
            <h2 className="text-white text-lg font-bold mb-4 border-b border-gray-700 pb-2">
              Nueva Cancha
            </h2>
            <CanchaForm
              onSubmit={handleCreate}
              submitText="Crear Cancha"
              loading={creating}
              erroresExternos={formErrors}
              horariosOptions={horariosDisponibles}
            />
          </div>
        </Modal>
      )}

      {/* MODAL EDITAR */}
      {canchaEditar && (
        <Modal isOpen={!!canchaEditar} onClose={() => setCanchaEditar(null)}>
          <div className="p-4">
            <h2 className="text-white text-lg font-bold mb-4 border-b border-gray-700 pb-2">
              Editar Cancha
            </h2>
            <CanchaForm
              initialValues={{
                nombre: canchaEditar.nombre,
                horarios: canchaEditar.horarios || [],
              }}
              onSubmit={handleSubmitEditar}
              submitText="Guardar Cambios"
              loading={editing}
              erroresExternos={formErrors}
              horariosOptions={horariosDisponibles}
            />
          </div>
        </Modal>
      )}

      {/* CONFIRMACIÓN ELIMINAR */}
      {confirmDelete.open && (
        <MessageConfirm
          mensaje={`¿Seguro que deseas eliminar la cancha "${confirmDelete.cancha?.nombre}"? Se borrarán todas sus reservas y datos asociados.`}
          onClose={() => setConfirmDelete({ open: false, cancha: null })}
          onConfirm={ejecutarEliminacion}
          onCancel={() => setConfirmDelete({ open: false, cancha: null })}
        />
      )}
    </div>
  );
}
