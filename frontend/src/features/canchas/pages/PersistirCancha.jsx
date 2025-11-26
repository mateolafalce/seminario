import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import backendClient from "../../../shared/services/backendClient";
import CanchaForm from "../components/CanchaForm";
import { FiArrowLeft } from "react-icons/fi";

export default function PersistirCancha() {
  const { id } = useParams(); // Si hay ID, es edición
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing); 
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) return;
    
    const fetchCancha = async () => {
      try {
        const data = await backendClient.get(`canchas/obtener/${id}`);
        
        let horariosIds = [];
        if (Array.isArray(data.horarios)) {
            horariosIds = data.horarios.map(h => (typeof h === 'object' ? h.id : h));
        }

        setInitialData({
            ...data,
            horarios: horariosIds, // Pasamos solo los IDs limpios
            imagenes: data.imagenes || [] 
        });
      } catch (e) {
        setError("No se pudo cargar la cancha.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCancha();
  }, [id, isEditing]);

  const handleSubmit = async (values) => {
    try {
      if (isEditing) {
        await backendClient.put(`canchas/modificar/${id}`, values);
      } else {
        await backendClient.post("canchas/crear", values);
      }
      navigate("/panel-control/canchas"); 
    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + (e.response?.data?.detail || e.message));
    }
  };

  if (loading) return <div className="p-8 text-white">Cargando datos...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 border-b border-gray-700 pb-4 mb-6">
        <button 
            onClick={() => navigate("/panel-control/canchas")}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition"
        >
            <FiArrowLeft size={24} />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-white">{isEditing ? "Editar Cancha" : "Nueva Cancha"}</h2>
            <p className="text-gray-400 text-sm">Completa la información, carga fotos y define los horarios.</p>
        </div>
      </div>

      <CanchaForm
        initialValues={initialData || undefined} 
        onSubmit={handleSubmit}
        submitText={isEditing ? "Guardar Cambios" : "Crear Cancha"}
      />
    </div>
  );
}