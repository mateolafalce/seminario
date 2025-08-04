import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext'
import Button from '../components/common/Button/Button';
import MiToast from '../components/common/Toast/MiToast';

const categoria = ['2da','3ra','4ta', '5ta','6ta', '7ta', '8ta'];

// esta es una linea nueva que se uso para las ip y conectarse con el movil o cualquier dispositivo en la red
const BACKEND_URL = `http://${window.location.hostname}:8000`;

function BuscarCliente() {
  const [nombre, setNombre] = useState('');
  const [resultados, setResultados] = useState([]);
  const { isAuthenticated, isAdmin } = useContext(AuthContext)
  const [clienteEditar, setClienteEditar] = useState(null);

  if (!isAuthenticated || !isAdmin) {
    return <p className="text-center text-red-500 mt-10">No tienes permisos para ver esta página.</p>
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/users_b/buscar`
      : "/api/users_b/buscar";
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ nombre }), 
    });

    if (response.status === 401) {
      toast(<MiToast mensaje="Tu sesión ha expirado. Por favor, volvé a iniciar sesión." color="var(--color-red-400)"/>);
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } else if (response.ok) {
      const data = await response.json();
      setResultados(data.clientes || []); 
    } else {
      const errorText = await response.text();
      toast(<MiToast mensaje={errorText || 'Error en la solicitud'} color="var(--color-red-400)" />);
    } 
  };

  const handleEliminar = async (id) => {
    if (!window.confirm(`¿Seguro que deseas eliminar este cliente?`)) return;
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/users_b/eliminar`
      : "/api/users_b/eliminar";
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ identificador: id }),
    });

    if (response.status === 401) {
      toast(<MiToast mensaje="Tu sesión ha expirado. Por favor, volvé a iniciar sesión." color="var(--color-red-400)"/>);
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } else if (response.ok) {
      setResultados(prev => prev.filter(e => e._id !== id));
    } else {
      const errorText = await response.text();
      toast(<MiToast mensaje={errorText || 'Error en la solicitud'} color="var(--color-red-400)" />);
    }
  };

  const handleModificar = (cliente) => {
    setClienteEditar({
      id: cliente._id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
      categoria: cliente.categoria || "2da",
      habilitado: cliente.habilitado,
    });
  };

  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = window.location.hostname === "localhost"
      ? `${BACKEND_URL}/api/users_b/modificar`
      : "/api/users_b/modificar";
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({
        identificador: clienteEditar.id,
        nombre: clienteEditar.nombre,
        apellido: clienteEditar.apellido,
        email: clienteEditar.email,
        categoria: clienteEditar.categoria,
        habilitado: clienteEditar.habilitado,
      }),
    });

    if (response.status === 401) {
      toast(<MiToast mensaje="Tu sesión ha expirado. Por favor, volvé a iniciar sesión." color="var(--color-red-400)"/>);
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } else if (response.ok) {
      toast(<MiToast mensaje="Cliente actualizado correctamente" color="[#e5ff00]"/>);
      setClienteEditar(null);
      handleSubmit(e);
    } else {
      const errorText = await response.text();
      toast(<MiToast mensaje={errorText || 'Error en la solicitud'} color="var(--color-red-400)" />);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <h2 className="text-3xl font-bold text-center text-white mb-8">Buscar Cliente</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center mb-8">
        <input
          type="text"
          placeholder="Ingrese el username"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-[#E5FF00]"
        />
        <Button
          type="submit"
          texto="Buscar"
          variant="default"
        />
      </form>

      <div className="space-y-6">
        {resultados.map((cliente, index) => (
          <div key={index} className="bg-gray-800 rounded-2xl shadow-lg p-6 relative">
            <h3 className="text-xl font-semibold text-white mb-2">{cliente.nombre} {cliente.apellido}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-gray-300 text-base">
              <p><span className="font-bold text-white">Username:</span> {cliente.username}</p>
              <p><span className="font-bold text-white">Email:</span> {cliente.email}</p>
              <p><span className="font-bold text-white">Habilitado:</span> {cliente.habilitado ? 'Sí' : 'No'}</p>
              <p><span className="font-bold text-white">Categoria:</span> {cliente.categoria ? cliente.categoria : 'No Registrado'}</p>
              <p><span className="font-bold text-white">Se Registro:</span> {cliente.fecha_registro}</p>
              <p><span className="font-bold text-white">Ultima Conexion:</span> {cliente.ultima_conexion}</p>
            </div>
            <div className="flex gap-4 mt-4">
              <Button
                type="button"
                texto="Modificar"
                onClick={() => handleModificar(cliente)}
                variant="modificar"
              />
              <Button
                type="button"
                texto="Eliminar"
                onClick={() => handleEliminar(cliente._id)}
                variant="eliminar"
              />
            </div>

            {clienteEditar && clienteEditar.id === cliente._id && (
              <div className="mt-6 bg-gray-900 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Editar Cliente</h3>
                <form onSubmit={handleEditarSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={clienteEditar.nombre}
                    onChange={(e) => setClienteEditar({ ...clienteEditar, nombre: e.target.value })}
                    placeholder="Nombre"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={clienteEditar.apellido}
                    onChange={(e) => setClienteEditar({ ...clienteEditar, apellido: e.target.value })}
                    placeholder="Apellido"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                  />
                  <input
                    type="email"
                    value={clienteEditar.email}
                    onChange={(e) => setClienteEditar({ ...clienteEditar, email: e.target.value })}
                    placeholder="Email"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                  />
                  <select
                    value={clienteEditar.categoria}
                    onChange={(e) => setClienteEditar({ ...clienteEditar, categoria: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categoria.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={clienteEditar.habilitado}
                      onChange={(e) =>
                        setClienteEditar({
                          ...clienteEditar,
                          habilitado: e.target.checked,
                        })
                      }
                      className="accent-[#E5FF00] w-5 h-5"
                    />
                    <label className="text-white">Usuario habilitado</label>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <Button
                      type="submit"
                      texto="Guardar cambios"
                      variant="default"
                    />
                    <Button
                      type="button"
                      texto="Cancelar"
                      onClick={() => setClienteEditar(null)}
                      variant="cancelar"
                    />
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BuscarCliente;