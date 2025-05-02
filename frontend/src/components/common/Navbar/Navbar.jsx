import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import Button from "../Button/Button";
import logoCompleto from "../../../assets/icons/logoCompletoBlanco.svg";

// las redirecciones centrales
const centerLinks = [
  { label: "Home", path: "/home", show: ({ isAuthenticated }) => true },
  { label: "Turnos", path: "/reserva", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Preferencias", path: "/preferencias", show: ({ isAuthenticated, isAdmin }) => isAuthenticated && !isAdmin },
  { label: "Admin", path: "/Admin", show: ({ isAuthenticated, isAdmin }) => isAuthenticated && isAdmin },
  { label: "Gestionar Cliente", path: "/gestionar-clientes", show: ({ isAuthenticated, isAdmin }) => isAuthenticated && isAdmin },
];

// estilo de los botones del medio
const navBotonesCentrales = "text-white font-semibold text-base px-1 cursor-pointer transition-colors hover:text-[#E5FF00]";

// el componente para los links de navegacion (solo texto, tailwindcss)
const NavLinks = ({ links, isAuthenticated, isAdmin, onClick, className }) => (
  <>
    {links
      .filter(link => link.show({ isAuthenticated, isAdmin }))
      .map(link => (
        <button
          key={link.label}
          type="button"
          onClick={() => onClick(link.path)}
          className={`${navBotonesCentrales} ${className}`}
          style={{ fontFamily: "inherit" }}
        >
          {link.label}
        </button>
      ))}
  </>
);

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

  const renderSessionButtons = (isMobile = false) => {
    if (isAuthenticated) {
      return (
        <Button
          texto="Cerrar Sesión"
          onClick={handleLogout}
          variant="session"
          className={isMobile ? "mb-2" : ""}
        />
      );
    }
    return (
      <>
        <Button
          texto="Iniciar Sesión"
          onClick={() => isMobile ? handleNavigate("/login") : navigate("/login")}
          variant="session"
          className={isMobile ? "mb-2" : ""}
        />
        <Button
          texto="Registrarse"
          onClick={() => isMobile ? handleNavigate("/register") : navigate("/register")}
          variant="session"
          className={isMobile ? "" : "ml-2"}
        />
      </>
    );
  };

  return (
    <>
      {/* navbar */}
      <nav
        className={`fixed w-full z-50 backdrop-blur-md transition-colors duration-300 ${
          scrolled ? "bg-[#0D1B2A]/80 shadow-lg" : "bg-transparent"
        }`}
        style={{ minHeight: "3rem" }}
      >

        <div className="w-full grid grid-cols-3 items-center px-[2rem] lg:px-[5rem] xl:px-[12rem] 2xl:px-[12rem] h-14 relative">
          {/* logo a la izquierda */}
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={() => navigate("/home")}
          >
            <img
              src={logoCompleto}
              alt="Boulevard81 Logo"
              className="h-5 lg:h-5 mr-2 select-none"
              draggable={false}
              style={{ userSelect: "none" }}
            />
            <span className="text-white font-bold tracking-wide text-[1.2rem] ml-2 select-none">
              Boulevard81
            </span>
          </div>
          {/* redirecciones centrales */}
          <div className="hidden lg:flex justify-center items-center gap-2 whitespace-nowrap">
            <NavLinks
              links={centerLinks}
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
              onClick={navigate}
              className=""
            />
          </div>
          {/* botones sesion derecha */}
          <div className="hidden lg:flex justify-end items-center gap-2 flex-nowrap whitespace-nowrap">
            {renderSessionButtons(false)}
          </div>
          {/* boton mobil menu */}
          <button
            className="lg:hidden text-white focus:outline-none ml-auto col-start-3 justify-self-end"
            onClick={() => setShowOffcanvas(true)}
            aria-label="Abrir menú"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
      {/* el menu lateral para celulares */}
      {showOffcanvas && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex">
          <div className="w-64 bg-gray-900 h-full p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div
                className="flex items-center cursor-pointer select-none"
                onClick={() => handleNavigate("/home")}
              >
                <img
                  src={logoCompleto}
                  alt="Boulevard81 Logo"
                  className="h-8 mr-2 select-none"
                  draggable={false}
                  style={{ userSelect: "none" }}
                />
                <span className="text-white font-bold tracking-wide text-[1.2rem] ml-2 select-none">
                  Boulevard81
                </span>
              </div>
              <button
                className="text-white text-2xl ml-2"
                onClick={() => setShowOffcanvas(false)}
                aria-label="Cerrar menú"
              >
                &times;
              </button>
            </div>
            <nav className="flex flex-col space-y-2">
              <NavLinks
                links={centerLinks}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
                onClick={handleNavigate}
                className=""
              />
              <hr className="my-4 border-gray-700" />
              {renderSessionButtons(true)}
            </nav>
          </div>
          {/* ns/nc */}
          <div className="flex-1" onClick={() => setShowOffcanvas(false)} />
        </div>
      )}
      {/* espaciador */}
      <div className="h-14 lg:h-14" />
    </>
  );
}

export default CustomNavbar;