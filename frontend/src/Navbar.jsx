import { useNavigate } from 'react-router-dom'
import './index.css'

function Navbar() {
  const navigate = useNavigate()

  return (
    <div className="navbar">
      <button className="btn" onClick={() => navigate('/')}>Home</button>
      <button className="btn" onClick={() => navigate('/sobre-nosotros')}>Sobre Nosotros</button>
      <button className="btn" onClick={() => navigate('/login')}>Iniciar Sesión</button>
      <button className="btn" onClick={() => navigate('/register')}>Registrarse</button>
    </div>
  )
}

export default Navbar
