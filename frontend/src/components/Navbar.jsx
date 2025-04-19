import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, isAdmin } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
  };


  return (
    <nav className="navbar navbar-expand-sm bg-body-tertiary">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
          <ul className="navbar-nav ">
            <li className="nav-item">
              <Link className="nav-link" aria-current="page" to="/HomePage">Home</Link>
            </li>

            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/reserva">Reservas</Link>
                </li>
                {isAdmin && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/Admin">Admin</Link>
                  </li>
                )}
                {isAdmin && (<li className="nav-item">
                    <Link className="nav-link" to="/gestionar-cliente">Gestionar Cliente</Link>
                  </li>)}
                <li className="nav-item">
                  <Link className="nav-link" onClick={handleLogout} to="/login">Cerrar Sesión</Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Iniciar Sesión</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">Registrarse</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;