import React, { useContext, useEffect, useState } from "react"; // Importa React y hooks
import { Navbar, Nav, Container, Offcanvas } from "react-bootstrap"; // Importa componentes de Bootstrap
import { useNavigate } from "react-router-dom"; // Hook para navegar entre páginas
import { AuthContext } from "../../../context/AuthContext"; // Contexto para saber si el usuario está logueado y si es admin
import Button from "../Button/Button"; // Botón personalizado
import logoCompleto from "../../../assets/icons/logoCompletoBlanco.svg"; // Logo de la app
import "./Navbar.css"; // Estilos de la barra

function CustomNavbar() { // Componente principal de la barra de navegación
  const navigate = useNavigate(); // Hook para cambiar de página
  const { isAuthenticated, logout, isAdmin } = useContext(AuthContext); // Obtiene si el usuario está logueado y si es admin
  const [scrolled, setScrolled] = useState(false); // Estado para saber si se hizo scroll
  const [showOffcanvas, setShowOffcanvas] = useState(false); // Estado para mostrar el menú lateral en mobile

  useEffect(() => { // Efecto para cambiar el fondo de la navbar al hacer scroll
    const handleScroll = () => setScrolled(window.scrollY > 80); // Si scroll > 40px, cambia el fondo
    window.addEventListener("scroll", handleScroll); // Escucha el scroll
    return () => window.removeEventListener("scroll", handleScroll); // Limpia el listener
  }, []);

  const handleLogout = () => { // Función para cerrar sesión
    logout(); // Llama a logout del contexto
    navigate("/login"); // Navega al login
    setShowOffcanvas(false); // Cierra el menú lateral si está abierto
  };

  const handleNavigate = (path) => { // Navega a una ruta y cierra el menú lateral
    navigate(path);
    setShowOffcanvas(false);
  };

  return (
    <>
      <Navbar
        expand="md" // Navbar se expande en pantallas medianas o más grandes
        className={`py-2 custom-navbar ${scrolled ? "navbar-solid" : "navbar-transparent"}`} // Cambia el fondo si se scrollea
        data-bs-theme="dark"
        fixed="top" // Fija la navbar arriba
      >
        <Container fluid className="navbar-container">
          {/* NAVBAR: Logo + Links + Sesión en una sola fila (solo desktop) */}
          <Nav className="w-100 align-items-center d-none d-md-flex" style={{ gap: 8 }}>
            {/* Logo a la izquierda */}
            <span
              className="navbar-brand-custom"
              style={{ cursor: "pointer", display: "flex", alignItems: "center", marginRight: 16 }}
              onClick={() => navigate("/home")} // Al hacer click, navega a Home
            >
              <img
                src={logoCompleto}
                alt="Boulevard81 Logo"
                className="navbar-logo-img"
                draggable={false}
              />
              <span className="navbar-title" tabIndex={-1}>
                Boulevard81
              </span>
            </span>
            {/* Links de navegación al centro */}
            <Nav.Link onClick={() => navigate("/home")} className="navbar-link">
              Home
            </Nav.Link>
            {isAuthenticated && ( // Si está logueado, muestra Turnos
              <Nav.Link onClick={() => navigate("/reserva")} className="navbar-link">
                Turnos
              </Nav.Link>
            )}
            {isAuthenticated && !isAdmin && ( // Si está logueado y NO es admin, muestra Preferencias
              <Nav.Link onClick={() => navigate("/preferencias")} className="navbar-link">
                Preferencias
              </Nav.Link>
            )}
            {isAuthenticated && isAdmin && ( // Si es admin, muestra Admin y Gestionar Cliente
              <>
                <Nav.Link onClick={() => navigate("/Admin")} className="navbar-link">
                  Admin
                </Nav.Link>
                <Nav.Link onClick={() => navigate("/gestionar-clientes")} className="navbar-link">
                  Gestionar Cliente
                </Nav.Link>
              </>
            )}
            {/* Botones de sesión a la derecha */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {isAuthenticated ? ( // Si está logueado, muestra Cerrar Sesión
                <Button
                  texto="Cerrar Sesión"
                  onClick={handleLogout}
                  className="btn btn-light btn-small"
                />
              ) : ( // Si NO está logueado, muestra Iniciar Sesión y Registrarse
                <>
                  <Button
                    texto="Iniciar Sesión"
                    onClick={() => navigate("/login")}
                    className="btn btn-light btn-small"
                  />
                  <Button
                    texto="Registrarse"
                    onClick={() => navigate("/register")}
                    className="btn btn-light btn-small ms-2"
                  />
                </>
              )}
            </div>
          </Nav>

          {/* Botón "sandwich" para mobile, solo visible en mobile */}
          <Navbar.Toggle
            aria-controls="navbar-offcanvas"
            className="d-flex d-md-none navbar-toggle"
            onClick={() => setShowOffcanvas(true)} // Abre el menú lateral
          >
            <span className="bi bi-list" style={{ fontSize: 24 }}></span>
          </Navbar.Toggle>
        </Container>
      </Navbar>

      {/* Menú lateral (Offcanvas) para mobile */}
      <Offcanvas show={showOffcanvas} onHide={() => setShowOffcanvas(false)} placement="start" className="bg-dark">
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title>
            <span className="navbar-title">Menú</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {/* Logo arriba del menú lateral */}
            <span
              className="navbar-brand-custom mb-3"
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
              onClick={() => handleNavigate("/home")}
            >
              <img
                src={logoCompleto}
                alt="Boulevard81 Logo"
                className="navbar-logo-img"
                draggable={false}
              />
              <span className="navbar-title" tabIndex={-1}>
                Boulevard81
              </span>
            </span>
            {/* Links de navegación en el menú lateral */}
            <Nav.Link onClick={() => handleNavigate("/home")} className="navbar-link text-white">
              Home
            </Nav.Link>
            {isAuthenticated && (
              <Nav.Link onClick={() => handleNavigate("/reserva")} className="navbar-link text-white">
                Turnos
              </Nav.Link>
            )}
            {isAuthenticated && !isAdmin && (
              <Nav.Link onClick={() => handleNavigate("/preferencias")} className="navbar-link text-white">
                Preferencias
              </Nav.Link>
            )}
            {isAuthenticated && isAdmin && (
              <>
                <Nav.Link onClick={() => handleNavigate("/Admin")} className="navbar-link text-white">
                  Admin
                </Nav.Link>
                <Nav.Link onClick={() => handleNavigate("/gestionar-clientes")} className="navbar-link text-white">
                  Gestionar Cliente
                </Nav.Link>
              </>
            )}
            {/* Línea divisoria (puedes quitarla si no la quieres) */}
            <hr className="bg-secondary"/>
            {/* Botones de sesión en el menú lateral */}
            {isAuthenticated ? (
              <Button
                texto="Cerrar Sesión"
                onClick={handleLogout}
                className="btn btn-light btn-small my-2"
              />
            ) : (
              <>
                <Button
                  texto="Iniciar Sesión"
                  onClick={() => handleNavigate("/login")}
                  className="btn btn-light btn-small my-2"
                />
                <Button
                  texto="Registrarse"
                  onClick={() => handleNavigate("/register")}
                  className="btn btn-light btn-small my-2"
                />
              </>
            )}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default CustomNavbar;