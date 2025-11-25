import { useState } from "react";
import { useNavigate } from "react-router-dom";
import backendClient from "../../../../shared/services/backendClient";
import Button from "../../../../shared/components/ui/Button/Button";
import ListarCanchas from "../../../canchas/pages/ListarCanchas";
import { MdAccessTime, MdAddCircleOutline } from "react-icons/md";

export default function GestionCanchas() {
  const navigate = useNavigate();
  const [mensajeError, setMensajeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const irACrear = () => {
    navigate("/panel-control/canchas/nueva");
  };

  const irAEditar = (cancha) => {
    navigate(`/panel-control/canchas/editar/${cancha.id}`);
  };

  const handleEliminarCancha = async (cancha) => {
    if (!window.confirm(`¿Seguro que querés eliminar "${cancha.nombre}"?`)) return;
    try {
      setLoading(true);
      setMensajeError("");
      await backendClient.delete(`canchas/eliminar/${cancha.id}`);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setMensajeError(e?.response?.data?.detail || "Error al eliminar. Verificá reservas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-700/70 rounded-xl p-5 shadow-lg">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">Gestión de Canchas</h2>
          <p className="text-xs text-gray-500 mt-0.5">Espacios y horarios disponibles</p>
        </div>

        <div className="flex items-center gap-3">
            <Button
                texto="Horarios"
                onClick={() => navigate("/panel-control/canchas/horarios")}
                variant="secondary"
                size="md"
                icon={<MdAccessTime size={18} />}
            />
            <Button
                texto="Crear Cancha"
                variant="default"
                size="md"
                onClick={irACrear}
                disabled={loading}
                icon={<MdAddCircleOutline size={18} />}
            />
        </div>
      </div>

      {mensajeError && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {mensajeError}
        </div>
      )}

      <ListarCanchas
        reloadKey={reloadKey}
        onSeleccionar={irAEditar}
        onEliminar={handleEliminarCancha}
      />
    </div>
  );
}