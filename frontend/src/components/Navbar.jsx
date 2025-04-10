import { useNavigate} from 'react-router-dom'
import '../index.css'
import { useContext} from 'react'
import { AuthContext } from './AuthContext'

function Navbar() {
  const navigate = useNavigate();
  const {isAuthenticated, logout, isAdmin} = useContext(AuthContext)

  const handleLogout = () =>{
    logout()
    navigate('/login')
  }

  return (
    <div className="navbar">
      <button className="btn" onClick={() => navigate('/HomePage')}>Home</button>
      <button className="btn" onClick={() => navigate('/sobre-nosotros')}>Sobre Nosotros</button>

      {isAuthenticated ? (
        <>
          <button className="btn" onClick={() => navigate('/turnos')}>Turnos</button>
          {isAdmin && (
            <button className="btn" onClick={() => navigate('/admin')}>Admin</button>
          )}
          <button className="btn" onClick={handleLogout}>Cerrar Sesión</button>
        </>
      ) : (
        <>
          <button className="btn" onClick={() => navigate('/login')}>Iniciar Sesión</button>
          <button className="btn" onClick={() => navigate('/register')}>Registrarse</button>
        </>
      )}
    </div>
  );
}

export default Navbar;