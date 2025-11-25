import { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../shared/services/adminApi";
import ReservaFormAdmin from "../components/ReservaFormAdmin";
import { FiArrowLeft } from "react-icons/fi";
import { toast } from "react-toastify";
import MiToast from "../../../shared/components/ui/Toast/MiToast";

export default function PersistirReservaAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (payload) => {
    try {
      setLoading(true);
      await adminApi.reservas.crearReservaAdmin(payload);
      toast(<MiToast mensaje="Reserva creada con éxito" color="#10b981" />);
      navigate("/panel-control/reservas");
    } catch (e) {
      toast(<MiToast mensaje={e?.message || "Error al crear reserva"} color="#ef4444" />);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-700 pb-4 mb-6">
        <button 
            onClick={() => navigate("/panel-control/reservas")}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition"
        >
            <FiArrowLeft size={24} />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-white">Nueva Reserva</h2>
            <p className="text-gray-400 text-sm">Registrar un turno manualmente para usuarios.</p>
        </div>
      </div>

      <ReservaFormAdmin onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}