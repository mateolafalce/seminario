import { useState, useContext } from 'react';
import { AuthContext } from '../components/AuthContext'
import "../styles/Buscar.css"

const categoria = ['2da','3ra','4ta', '5ta','6ta', '7ta', '8ta'];

function BuscarCliente() {
  const [nombre, setNombre] = useState('');
  const [resultados, setResultados] = useState([]);
  const { isAuthenticated, isAdmin } = useContext(AuthContext)
  const [clienteEditar, setClienteEditar] = useState(null);

  if (!isAuthenticated || !isAdmin) {
    return <p>No tienes permisos para ver esta página.</p>
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('http://127.0.0.1:8000/users_b/buscar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ nombre }), 
    });

    if (response.status === 401) {
      alert('Tu sesión ha expirado. Por favor, volvé a iniciar sesión.');
      window.location.href = '/login';
    } else if (response.ok) {
      const data = await response.json();
      setResultados(data.clientes || []); 
    } else {
      const errorText = await response.text();
      alert(errorText || 'Error en la solicitud')
    } 
  };

  const handleEliminar = async (id) => {
    if (!window.confirm(`¿Seguro que deseas eliminar este cliente?`)) return;
      const response = await fetch('http://127.0.0.1:8000/users_b/eliminar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ identificador: id }),
      });

      if (response.status === 401) {
        alert('Tu sesión ha expirado. Por favor, volvé a iniciar sesión.');
        window.location.href = '/login';
      } else if (response.ok) {
        setResultados(prev => prev.filter(e => e._id !== id));
      } else {
        const errorText = await response.text();
        alert(errorText || 'Error en la solicitud')
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
    const response = await fetch('http://127.0.0.1:8000/users_b/modificar', {
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
       alert('Tu sesión ha expirado. Por favor, volvé a iniciar sesión.');
      window.location.href = '/login';
    } else if (response.ok) {
      alert('Cliente actualizado correctamente');
      setClienteEditar(null);
      handleSubmit(e);
    } else {
      const errorText = await response.text();
      alert(errorText || 'Error en la solicitud')
    }
  };

  return (
    <div className="buscar-container">
      <h2>Buscar Cliente</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ingrese el username"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <button type="submit">Buscar</button>
      </form>

      <div className="resultados">
        {resultados.map((cliente, index) => (
          <div key={index} className="espacio-card">
            <h3>{cliente.nombre} {cliente.apellido}</h3>
            <p><strong>Username:</strong> {cliente.username}</p>
            <p><strong>Email:</strong> {cliente.email}</p>
            <p><strong>Habilitado:</strong> {cliente.habilitado ? 'Sí' : 'No'}</p>
            <p><strong>Categoria:</strong> {cliente.categoria ? cliente.categoria : 'No Registrado'}</p>
            <p><strong>Se Registro:</strong> {cliente.fecha_registro}</p>
            <p><strong>Ultima Conexion:</strong> {cliente.ultima_conexion}</p>

            <div className="acciones">
              <button onClick={() => handleModificar(cliente)}>Modificar</button>
              <button onClick={() => handleEliminar(cliente._id)}>Eliminar</button>
            </div>

            {clienteEditar && clienteEditar.id === cliente._id && (
              <div className="form-editar">
                <h3>Editar Cliente</h3>
                <form onSubmit={handleEditarSubmit}>
                  <input
                    type="text"
                    value={clienteEditar.nombre}
                    onChange={(e) => setClienteEditar({ ...clienteEditar, nombre: e.target.value })}
                    placeholder="Nombre"
                    required
                  />
                  <input
                    type="text"
                    value={clienteEditar.apellido}
                    onChange={(e) => setClienteEditar({ ...clienteEditar, apellido: e.target.value })}
                    placeholder="Apellido"
                    required
                  />
                  <input
                    type="email"
                    value={clienteEditar.email}
                    onChange={(e) => setClienteEditar({ ...clienteEditar, email: e.target.value })}
                    placeholder="Email"
                    required
                  />
                  <br/>
                <select
                  value={clienteEditar.categoria}
                  onChange={(e) => setClienteEditar({ ...clienteEditar, categoria: e.target.value })}
                >
                  <option value="">Seleccionar categoría</option>
                  {categoria.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <br/>
                  <input
                    type="checkbox"
                    checked={clienteEditar.habilitado}
                    onChange={(e) =>
                      setClienteEditar({
                        ...clienteEditar,
                        habilitado: e.target.checked,
                      })
                    }
                  />
                  <label>Usuario habilitado</label>
                  <br/>
                  <button type="submit">Guardar cambios</button>
                  <button type="button" onClick={() => setClienteEditar(null)}>Cancelar</button>
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