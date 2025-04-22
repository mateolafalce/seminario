import { useEffect, useState, useContext } from "react";
import { generarHorarios } from '../components/ReservaTabla';
import { AuthContext } from '../components/AuthContext'

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const canchasDisponibles = ['Blindex A','Blindex B','Blindex C', 'Cemento Techada','Cemento Sin Techar'];
const horariosDisponibles = generarHorarios();

export default function PreferenciasUsuario() {
  const habilitado = localStorage.getItem('habilitado');
  const [dias, setDias] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [preferenciasGuardadas, setPreferenciasGuardadas] = useState([]);

  const fetchPreferencias = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/preferencias/obtener', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPreferenciasGuardadas(data);
      } else {
        console.error("Error al obtener preferencias");
      }
    } catch (error) {
      console.error("Error en la petición:", error);
    }
  };

  useEffect(() => {
    fetchPreferencias();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const preferencias = { dias, horarios, canchas };

    const response = await fetch('http://127.0.0.1:8000/preferencias/guardar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(preferencias),
    });

    if (response.ok) {
      alert("Preferencias guardadas con éxito");
      setDias([]);
      setHorarios([]);
      setCanchas([]);
      fetchPreferencias();  // Vuelve a cargar después de guardar
    } else {
      alert("Error al guardar preferencias");
    }
  };

  const toggleItem = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  if (!habilitado) {
    return (
      <div className="p-4 space-y-6">
        <p className="text-red-600 font-bold">Debes estar habilitado para poder elegir tus preferencias.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 space-y-4">
        <div>
          <label className="font-bold block mb-1">Días preferidos:</label>
          <div className="flex flex-wrap gap-2">
            {diasSemana.map(dia => (
              <button
                type="button"
                key={dia}
                className={`px-3 py-1 border rounded ${dias.includes(dia) ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => toggleItem(dias, setDias, dia)}
              >
                {dia}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-bold block mb-1">Horarios preferidos:</label>
          <div className="flex flex-wrap gap-2">
            {horariosDisponibles.map(hora => (
              <button
                type="button"
                key={hora}
                className={`px-3 py-1 border rounded ${horarios.includes(hora) ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                onClick={() => toggleItem(horarios, setHorarios, hora)}
              >
                {hora}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-bold block mb-1">Canchas preferidas:</label>
          <div className="flex flex-wrap gap-2">
            {canchasDisponibles.map(c => (
              <button
                type="button"
                key={c}
                className={`px-3 py-1 border rounded ${canchas.includes(c) ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
                onClick={() => toggleItem(canchas, setCanchas, c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <br/>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Guardar preferencias
        </button>
      </form>

      {/* Lista de preferencias guardadas */}
      <div className="bg-gray-100 p-4 rounded shadow">
        <h2 className="font-bold text-lg mb-2">Tus preferencias guardadas:</h2>
        {preferenciasGuardadas.length === 0 ? (
          <p>No tienes preferencias guardadas aún.</p>
        ) : (
          <ul className="space-y-3">
            {preferenciasGuardadas.map((pref, index) => (
              <li key={index} className="bg-white p-3 rounded shadow">
                <p><strong>Días:</strong> {pref.dias.join(', ')}</p>
                <p><strong>Horarios:</strong> {pref.horarios.join(', ')}</p>
                <p><strong>Canchas:</strong> {pref.canchas.join(', ')}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
