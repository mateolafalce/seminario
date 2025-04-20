import { useNavigate } from 'react-router-dom'
import { useContext, useState } from 'react'
import { AuthContext } from '../components/AuthContext'

function GestionClientes() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, isAdmin } = useContext(AuthContext)
  const [state, setState] = useState(0);

  if (!isAuthenticated || !isAdmin) {
    return <p>No tienes permisos para ver esta página.</p>
  }

  return (
    <div className="register-container">
      <div className="menu">
        <h2>Gestionar Clientes</h2>
        <button onClick={() => navigate('/register')}>Crear</button>
        <button onClick={() => navigate('/clientes/buscar')}>Buscar</button>
      </div>
    </div>
  )
}

export default GestionClientes;
