import React, { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import Button from "../Button/Button";
import logoCompleto from "../../../assets/icons/logoCompletoBlanco.svg";
import { motion, AnimatePresence } from "framer-motion";

// las redirecciones centrales
const centerLinks = [
  { label: "Home", path: "/home", show: ({ isAuthenticated }) => true },
  { label: "Canchas", path: "/canchas", show: ({ isAuthenticated }) => true },
  { label: "Turnos", path: "/reserva", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Mis Reservas", path: "/mis-reservas", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Preferencias", path: "/preferencias", show: ({ isAuthenticated, isAdmin }) => isAuthenticated && !isAdmin },
  { label: "Admin", path: "/Admin", show: ({ isAuthenticated, isAdmin }) => isAuthenticated && isAdmin },
];

// estilo de los botones del medio
const navBotonesCentrales = 'text-white font-semibold text-base px-1 cursor-pointer transition-colors hover:text-[#E5FF00]';

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
          minHeight: "3rem",
          backgroundColor: scrolled ? 'rgba(13, 27, 42, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: scrolled ? 'blur(8px)' : 'blur(0px)'
        }}
      >

        <div className='w-full grid grid-cols-3 items-center px-[2rem] lg:px-[5rem] xl:px-[12rem] 2xl:px-[12rem] h-[3.5rem] relative'>
          {/* logo a la izquierda */}
          <div
            className='flex items-center cursor-pointer select-none'
            onClick={() => navigate("/home")}
          >
            <img
              src={logoCompleto}
              alt="Boulevard81 Logo"
              className='mr-[0.5rem] select-none'
              style={{ userSelect: "none", height: "1.5rem", width: "auto", display: "block" }}
              draggable={false}
            />
            <span className='text-white font-bold tracking-wide text-[1.2rem] ml-[0.5rem] select-none'>
              Boulevard81
            </span>
          </div>
          {/* redirecciones centrales */}
          <div className='hidden lg:flex justify-center items-center gap-[0.5rem] whitespace-nowrap'>
            <NavLinks
              links={centerLinks}
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
              onClick={navigate}
              className=''
            />
          </div>
          {/* botones sesion derecha */}
          <div className='hidden lg:flex justify-end items-center gap-[0.5rem] flex-nowrap whitespace-nowrap'>
            {renderSessionButtons(false)}
          </div>
          {/* boton mobil menu */}
          <button
            className='lg:hidden text-white focus:outline-none ml-auto col-start-3 justify-self-end'
            onClick={() => setShowOffcanvas(true)}
            aria-label="Abrir menú"
          >
            <svg className="w-[2rem] h-[2rem]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
      {/* el menu fullscreen para celulares */}
      <AnimatePresence>
        {showOffcanvas && (
          <motion.div
            className='fixed inset-0 z-50 bg-[#0D1B2A] lg:hidden'
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* boton cerrar minimalista */}
            <button
              onClick={() => setShowOffcanvas(false)}
              className='absolute top-8 right-8 text-white/60 hover:text-white transition-colors z-10'
              aria-label="Cerrar menú"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* contenido ultra minimalista */}
            <div className='h-full flex flex-col justify-center items-center'>
              <nav className='flex flex-col space-y-8 mb-12'>
                {centerLinks
                  .filter(link => link.show({ isAuthenticated, isAdmin }))
                  .map(link => (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => handleNavigate(link.path)}
                      className='text-white text-3xl font-extralight text-center py-2 transition-all duration-300 hover:text-[#E5FF00] hover:scale-105'
                    >
                      {link.label}
                    </button>
                  ))}
              </nav>
              
              {/* botones de sesion minimalistas */}
              {!isAuthenticated ? (
                <div className='flex flex-col space-y-6'>
                  <button
                    onClick={() => handleNavigate("/login")}
                    className='text-white text-xl font-extralight text-center py-2 transition-all duration-300 hover:text-[#E5FF00] hover:scale-105 border border-white/20 rounded-full px-8'
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => handleNavigate("/register")}
                    className='text-[#0D1B2A] text-xl font-extralight text-center py-2 transition-all duration-300 hover:bg-[#E5FF00] bg-white rounded-full px-8'
                  >
                    Registrarse
                  </button>
                </div>
              ) : (
                <div className='flex flex-col space-y-4'>
                  <button
                    onClick={handleLogout}
                    className='text-white text-xl font-extralight text-center py-2 transition-all duration-300 hover:text-red-400 hover:scale-105 border border-white/20 rounded-full px-8'
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* espaciador */}
      <div className='h-[3.5rem] lg:h-[3.5rem]' />
    </>
  );
}

export default CustomNavbar;