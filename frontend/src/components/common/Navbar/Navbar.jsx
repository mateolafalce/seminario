import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import Button from "../Button/Button";
import logoCompleto from "../../../assets/icons/logoCompletoBlanco.svg";
import { motion, AnimatePresence } from "framer-motion";

// las redirecciones centrales
const centerLinks = [
  { label: "Home", path: "/home", show: ({ isAuthenticated }) => true },
  { label: "Turnos", path: "/reserva", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Reservas", path: "/mis-reservas", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Preferencias", path: "/preferencias", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Datos", path: "/mis-datos", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Reseñas", path: "/reseñas", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Jugadores", path: "/jugadores", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Jugadores", path: "/jugadores", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Cargar Resultados", path: "/cargar-resultados", show: ({ isAuthenticated, isEmpleado }) => isAuthenticated && isEmpleado },
  { label: "Admin", path: "/admin/dashboard", show: ({ isAuthenticated, isAdmin }) => isAuthenticated && isAdmin },
];

// estilo de los botones del medio
const navBotonesCentrales = 'text-white font-semibold text-base px-1 cursor-pointer transition-colors hover:text-[#E5FF00]';

// el componente para los links de navegacion (solo texto, tailwindcss)
const NavLinks = ({ links, isAuthenticated, isAdmin, isEmpleado, onClick, className }) => (
  <>
    {links
      .filter(link => link.show({ isAuthenticated, isAdmin, isEmpleado }))
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
  const { isAuthenticated, logout, isAdmin, isEmpleado } = useContext(AuthContext);
  const [scrolled, setScrolled] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowOffcanvas(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
          className={isMobile ? 'mb-2' : ''}
        />
      );
    }
    return (
      <>
        <Button
          texto="Iniciar Sesión"
          onClick={() => isMobile ? handleNavigate("/login") : navigate("/login")}
          variant="session"
          className={isMobile ? 'mb-2' : ''}
        />
        <Button
          texto="Registrarse"
          onClick={() => isMobile ? handleNavigate("/register") : navigate("/register")}
          variant="session"
          className={isMobile ? '' : 'ml-2'}
        />
      </>
    );
  };

  // Links visibles según rol
  const visibleLinks = centerLinks.filter(link =>
    link.show({ isAuthenticated, isAdmin, isEmpleado })
  );

  return (
    <>
      {/* navbar */}
      <nav
        className={
          scrolled
            ? 'fixed w-full z-50 transition-all duration-700 shadow-lg'
            : 'fixed w-full z-50 transition-all duration-700'
        }
        style={{
          height: "3.5rem",
          backgroundColor: scrolled ? 'rgba(13, 27, 42, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: scrolled ? 'blur(8px)' : 'blur(0px)'
        }}
      >
        {/* Contenedor principal con posicionamiento relativo */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-full flex items-center justify-between">

          {/* Logo (Izquierda) */}
          <div className="flex items-center cursor-pointer select-none" onClick={() => handleNavigate("/home")}>
            <img
              src={logoCompleto}
              alt="Boulevard81 Logo"
              className="mr-2 flex-shrink-0 select-none"
              style={{ userSelect: "none", height: "1.5rem", width: "auto", display: "block" }}
              draggable={false}
            />
          </div>

          {/* Links de navegación (Centrados absolutamente) - SOLO DESKTOP */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-2">
              {visibleLinks.map(link => (
                <button
                  key={link.label}
                  onClick={() => handleNavigate(link.path)}
                  className="text-white font-semibold px-2 py-1 rounded transition-colors duration-300 text-base hover:text-[#E5FF00]"
                  style={{ fontFamily: "inherit" }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de sesión (Derecha) */}
          <div className="flex items-center">
            {/* Botones sesión desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {renderSessionButtons(false)}
            </div>
            {/* Botón menú mobile */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowOffcanvas(true)}
                className="text-white hover:bg-[#1B263B] p-2 rounded focus:outline-none"
                aria-label="Abrir menú"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </nav>
      {/* el menu fullscreen para celulares */}
      <AnimatePresence>
        {showOffcanvas && (
          <motion.div
            className="fixed inset-0 z-50 bg-[#0D1B2A] lg:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* boton cerrar minimalista */}
            <button
              onClick={() => setShowOffcanvas(false)}
              className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors z-10"
              aria-label="Cerrar menú"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* contenido ultra minimalista */}
            <div className="h-full flex flex-col justify-center items-center">
              <nav className="flex flex-col space-y-8 mb-12">
                {visibleLinks.map(link => (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => handleNavigate(link.path)}
                    className="text-white text-3xl font-extralight text-center py-2 transition-all duration-300 hover:text-[#E5FF00] hover:scale-105"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
              {/* botones de sesion minimalistas */}
              {!isAuthenticated ? (
                <div className="flex flex-col space-y-6">
                  <button
                    onClick={() => handleNavigate("/login")}
                    className="text-white text-xl font-extralight text-center py-2 transition-all duration-300 hover:text-[#E5FF00] hover:scale-105 border border-white/20 rounded-full px-8"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => handleNavigate("/register")}
                    className="text-[#0D1B2A] text-xl font-extralight text-center py-2 transition-all duration-300 hover:bg-[#E5FF00] bg-white rounded-full px-8"
                  >
                    Registrarse
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <button
                    onClick={handleLogout}
                    className="text-white text-xl font-extralight text-center py-2 transition-all duration-300 hover:text-red-400 hover:scale-105 border border-white/20 rounded-full px-8"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Espaciador para evitar superposición */}
      <div style={{ height: "3.5rem" }} />
    </>
  );
}

export default CustomNavbar;