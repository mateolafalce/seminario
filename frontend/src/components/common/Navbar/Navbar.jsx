import React, { useContext, useEffect, useState } from "react";
import { Navbar, Nav, Container, Offcanvas } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import Button from "../Button/Button";
import logoCompleto from "../../../assets/icons/logoCompletoBlanco.svg";
import "./Navbar.css";

function CustomNavbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, isAdmin } = useContext(AuthContext);
  const [scrolled, setScrolled] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setShowOffcanvas(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setShowOffcanvas(false);
  };

  return (
    <>
      <Navbar
        expand="md"
        className={`py-2 custom-navbar ${scrolled ? "navbar-solid" : "navbar-transparent"}`}
        data-bs-theme="dark"
        fixed="top"
      >
        <Container fluid className="navbar-container">
          <Nav className="w-100 align-items-center d-none d-md-flex" style={{ gap: 8 }}>
            <span
              className="navbar-brand-custom"
              style={{ cursor: "pointer", display: "flex", alignItems: "center", marginRight: 16 }}
              onClick={() => navigate("/home")}
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
            <Nav.Link onClick={() => navigate("/home")} className="navbar-link">
              Home
            </Nav.Link>
            {isAuthenticated && (
              <Nav.Link onClick={() => navigate("/reserva")} className="navbar-link">
                Turnos
              </Nav.Link>
            )}
            {isAuthenticated && !isAdmin && (
              <Nav.Link onClick={() => navigate("/preferencias")} className="navbar-link">
                Preferencias
              </Nav.Link>
            )}
            {isAuthenticated && isAdmin && (
              <>
                <Nav.Link onClick={() => navigate("/Admin")} className="navbar-link">
                  Admin
                </Nav.Link>
                <Nav.Link onClick={() => navigate("/gestionar-clientes")} className="navbar-link">
                  Gestionar Cliente
                </Nav.Link>
              </>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {isAuthenticated ? (
                <Button
                  texto="Cerrar Sesión"
                  onClick={handleLogout}
                  className="btn btn-light btn-small"
                />
              ) : (
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
          <Navbar.Toggle
            aria-controls="navbar-offcanvas"
            className="d-flex d-md-none navbar-toggle"
            onClick={() => setShowOffcanvas(true)}
          >
            <span className="bi bi-list" style={{ fontSize: 24 }}></span>
          </Navbar.Toggle>
        </Container>
      </Navbar>
      <Offcanvas show={showOffcanvas} onHide={() => setShowOffcanvas(false)} placement="start" className="bg-dark">
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title>
            <span className="navbar-title">Menú</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
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
            <hr className="bg-secondary"/>
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