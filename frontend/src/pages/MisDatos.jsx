import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";

function MisDatos() {
  const { apiFetch } = useContext(AuthContext);
  const [datos, setDatos] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPerfil = async () => {
      setLoading(true);
      const response = await apiFetch("/api/users_b/perfil", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDatos(data);
        setForm({
          nombre: data.nombre || "",
          apellido: data.apellido || "",
          email: data.email || ""
        });
      }
      setLoading(false);
    };
    fetchPerfil();
  }, [apiFetch]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const response = await apiFetch("/api/users_b/me/", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(form)
    });
    if (response.ok) {
      toast.success("Datos actualizados correctamente");
      setEditando(false);
      // Actualiza los datos mostrados
      const updated = await apiFetch("/api/users_b/perfil", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      if (updated.ok) setDatos(await updated.json());
    } else {
      const error = await response.json();
      toast.error(error.detail || "Error al actualizar");
    }
    setLoading(false);
  };

  if (loading && !datos) return <div className="text-center mt-8">Cargando...</div>;
  if (!datos) return null;

  return (
    <div className="max-w-md mx-auto mt-10 bg-gray-900 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-[#eaff00] mb-4 text-center">Mis Datos</h2>
      {!editando ? (
        <div>
          <div className="mb-2 text-gray-200"><b>Nombre:</b> {datos.nombre}</div>
          <div className="mb-2 text-gray-200"><b>Apellido:</b> {datos.apellido}</div>
          <div className="mb-2 text-gray-200"><b>Username:</b> {datos.username}</div>
          <div className="mb-2 text-gray-200"><b>Email:</b> {datos.email}</div>
          <div className="mb-2 text-gray-200"><b>Habilitado:</b> {datos.habilitado ? "Sí" : "No"}</div>
          <div className="mb-2 text-gray-200"><b>Fecha registro:</b> {datos.fecha_registro}</div>
          <div className="mb-2 text-gray-200"><b>Última conexión:</b> {datos.ultima_conexion || "Nunca"}</div>
          <div className="mb-2 text-gray-200"><b>Categoría:</b> {datos.categoria}</div>
          <button
            className="mt-4 bg-[#eaff00] text-[#0D1B2A] px-4 py-1 rounded font-bold"
            onClick={() => setEditando(true)}
          >Editar</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="block text-gray-300 mb-2">Nombre:
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 text-white mb-2"
              required
            />
          </label>
          <label className="block text-gray-300 mb-2">Apellido:
            <input
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 text-white mb-2"
              required
            />
          </label>
          <label className="block text-gray-300 mb-2">Email:
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 text-white mb-2"
              required
            />
          </label>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="bg-[#eaff00] text-[#0D1B2A] px-4 py-1 rounded font-bold"
              disabled={loading}
            >Guardar</button>
            <button
              type="button"
              className="bg-gray-600 text-white px-4 py-1 rounded font-bold"
              onClick={() => setEditando(false)}
              disabled={loading}
            >Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default MisDatos;