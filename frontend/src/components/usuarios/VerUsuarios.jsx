import React, { useState, useEffect } from 'react';
import '../../index.css'; // Importa los estilos globales

function VerUsuarios({ show, onHide }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!show) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('http://127.0.0.1:8000/admin/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error fetching users:', errorData);
          setError(`Error al cargar usuarios: ${response.status}`);
          return;
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Error de conexión al servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [show]);

  return (
    <div className={`modal fade ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Lista de Usuarios</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            {loading && <p>Cargando usuarios...</p>}
            {error && <p className="text-danger">{error}</p>}
            {!loading && !error && users.length > 0 ? (
              <ul>
                {users.map(user => (
                  <li key={user.id}>
                    <div className="card mb-3">
                      <div className="row g-0">
                        <div className="col-md-4">
                          <img src="/user.jpg" className="img-fluid rounded-start" alt="..." />
                        </div>
                        <div className="col-md-8">
                          <div className="card-body">
                            <h5 className="card-title">{user.nombre} {user.apellido}</h5>
                            <p className="card-text">información acerca del jugador</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (!loading && !error && (
              <p>No hay usuarios para mostrar.</p>
            ))}
          </div>
          <div className="modal-footer">
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerUsuarios;