import { useEffect, useState } from "react";
import { generarHorarios } from '../components/usuarios/ReservaTabla';
import Button from '../components/common/Button/Button';
import MiToast from "../components/common/Toast/MiToast";

// esta es una linea nueva que se uso para las ip y conectarse con el movil o cualquier dispositivo en la red
const BACKEND_URL = `http://${window.location.hostname}:8000`;

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const canchasDisponibles = ['Blindex A','Blindex B','Blindex C', 'Cemento Techada','Cemento Sin Techar'];
const horariosDisponibles = generarHorarios();

const secciones = [
  {
    label: "Días preferidos:",
    key: "dias",
    items: diasSemana,
    colorSel: "bg-[#eaff00] text-[#0D1B2A]",
    color: "bg-gray-700 text-[#eaff00] hover:bg-[#eaff00] hover:text-[#0D1B2A]"
  },
  {
    label: "Horarios preferidos:",
    key: "horarios",
    items: horariosDisponibles,
    colorSel: "bg-green-400 text-[#0D1B2A]",
    color: "bg-gray-700 text-green-300 hover:bg-green-400 hover:text-[#0D1B2A]"
  },
  {
    label: "Canchas preferidas:",
    key: "canchas",
    items: canchasDisponibles,
    colorSel: "bg-purple-400 text-white",
    color: "bg-gray-700 text-purple-200 hover:bg-purple-400 hover:text-white"
  }
];

export default function PreferenciasUsuario() {
  const habilitado = localStorage.getItem('habilitado');
  const [preferencias, setPreferencias] = useState({ dias: [], horarios: [], canchas: [] });
  const [preferenciasGuardadas, setPreferenciasGuardadas] = useState([]);
  const [preferenciaEditar, setPreferenciaEditar] = useState(null); // Estado para modo edición

  useEffect(() => {
    // antes iba: fetch('http://127.0.0.1:8000/preferencias/obtener', {
    // antes: fetch(`${BACKEND_URL}/preferencias/obtener`, {
    // ahora con /api:
    // En producción (nginx), usar ruta relativa
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/preferencias/obtener`
      : "/api/preferencias/obtener";
    fetch(url, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setPreferenciasGuardadas(data))
      .catch(() => {});
  }, []);

  const handleToggle = (key, item) => {
    setPreferencias(prev => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (preferencias.dias.length === 0 || preferencias.horarios.length === 0 || preferencias.canchas.length === 0) {
      toast(<MiToast mensaje="Debes seleccionar al menos un día, un horario y una cancha." color="--var-color-red-400"/>);
      return;
    }

    const isEditing = preferenciaEditar !== null;
    const url = isEditing
      ? (window.location.hostname === "localhost" ? `${BACKEND_URL}/api/preferencias/modificar/${preferenciaEditar.id}` : `/api/preferencias/modificar/${preferenciaEditar.id}`)
      : (window.location.hostname === "localhost" ? `${BACKEND_URL}/api/preferencias/guardar` : "/api/preferencias/guardar");
    
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(preferencias),
    });

    if (response.ok) {
      toast(
        <MiToast 
          mensaje={isEditing 
            ? "Preferencia actualizada con éxito" 
            : "Preferencias guardadas con éxito"
          } 
          color="var(--color-green-400)" 
        />
      );
      setPreferencias({ dias: [], horarios: [], canchas: [] });
      setPreferenciaEditar(null); // Salir del modo edición
      
      // Refrescar la lista de preferencias guardadas
      const urlObtener = window.location.hostname === "localhost"
        ? `${BACKEND_URL}/api/preferencias/obtener`
        : "/api/preferencias/obtener";
      fetch(urlObtener, { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }})
        .then(res => res.json())
        .then(data => setPreferenciasGuardadas(data));
    } else {
      const errorData = await response.json();
      toast(
        <MiToast 
          mensaje={`Error: ${errorData.detail || 'Error desconocido'}`} 
          color="var(--color-red-400)" 
        />
      );
    }
  };

  const handleModificarClick = (pref) => {
    setPreferenciaEditar(pref);
    setPreferencias({
      dias: pref.dias,
      horarios: pref.horarios,
      canchas: pref.canchas,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setPreferenciaEditar(null);
    setPreferencias({ dias: [], horarios: [], canchas: [] });
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta preferencia?")) {
      return;
    }

    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/preferencias/eliminar/${id}`
      : `/api/preferencias/eliminar/${id}`;
      
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (response.ok) {
      toast(<MiToast mensaje="Preferencia eliminada con éxito." color="[#e5ff00]"/>);
      setPreferenciasGuardadas(prev => prev.filter(p => p.id !== id));
    } else {
      const errorData = await response.json();
      toast(
        <MiToast 
          mensaje={`Error: ${errorData.detail || 'Error desconocido'}`} 
          color="var(--color-red-400)" 
        />
      );
    }
  };

  if (!habilitado) {
    return (
      <div className="p-4 space-y-6">
        <p className="text-red-600 font-bold">Debes estar habilitado para poder elegir tus preferencias.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[70vh] bg-[#101a2a] py-8 px-2">
      <div className="bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-3xl mb-8 border border-gray-700">
        <h2 className="text-2xl font-bold text-[#eaff00] mb-6 text-center">Tus Preferencias</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {secciones.map(({ label, key, items, colorSel, color }) => (
            <div key={key}>
              <label className="font-bold text-white block mb-2">{label}</label>
              <div className="flex flex-wrap gap-2">
                {items.map(item => (
                  <button
                    type="button"
                    key={item}
                    className={`px-4 py-1 rounded-full font-semibold transition-colors ${preferencias[key].includes(item) ? colorSel : color}`}
                    onClick={() => handleToggle(key, item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-center gap-4">
            <Button
              type="submit"
              texto={preferenciaEditar ? "Actualizar Preferencia" : "Guardar preferencias"}
              className="mt-4 px-6 py-2"
              variant="bold"
              disabled={!preferenciaEditar && preferenciasGuardadas.length >= 7}
            />
            {preferenciaEditar && (
              <Button
                type="button"
                texto="Cancelar"
                onClick={handleCancelEdit}
                className="mt-4 px-6 py-2"
                variant="cancelar"
              />
            )}
          </div>
          {!preferenciaEditar && preferenciasGuardadas.length >= 7 && (
            <p className="text-center text-yellow-400 mt-4 text-sm">
              Has alcanzado el límite de 7 preferencias. Para agregar una nueva, primero debes eliminar una existente.
            </p>
          )}
        </form>
      </div>
      <div className="bg-gray-900 rounded-2xl shadow p-6 w-full max-w-3xl border border-gray-700">
        <h2 className="font-bold text-lg text-[#eaff00] mb-4 text-center">Tus preferencias guardadas</h2>
        {preferenciasGuardadas.length === 0 ? (
          <p className="text-gray-300 text-center">No tienes preferencias guardadas aún.</p>
        ) : (
          <ul className="space-y-3">
            {preferenciasGuardadas.map((pref) => (
              <li key={pref.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                <div>
                  <p className="text-white"><strong>Días:</strong> <span className="text-[#eaff00]">{pref.dias.join(', ')}</span></p>
                  <p className="text-white"><strong>Horarios:</strong> <span className="text-green-300">{pref.horarios.join(', ')}</span></p>
                  <p className="text-white"><strong>Canchas:</strong> <span className="text-purple-300">{pref.canchas.join(', ')}</span></p>
                </div>
                <div className="flex gap-2">
                  <Button
                    texto="Modificar"
                    onClick={() => handleModificarClick(pref)}
                    variant="modificar"
                  />
                  <Button
                    texto="Eliminar"
                    onClick={() => handleEliminar(pref.id)}
                    variant="eliminar"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
