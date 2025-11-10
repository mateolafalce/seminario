import React, { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../../../features/auth/context/AuthContext";
import Button from "../../ui/Button/Button";
import logoCompleto from "../../../../assets/icons/logoCompletoBlanco.svg";
import { motion, AnimatePresence } from "framer-motion";
import { canManageUsers, canManageReservas } from "../../../utils/permissions";

function CustomNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, roles, permissions } = useContext(AuthContext);
  const me = { roles, permissions };

  const [scrolled, setScrolled] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // fondo blur al scrollear
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // cerrar drawer al pasar a desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setShowOffcanvas(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // accesibilidad: cerrar con Escape y bloquear scroll de fondo
  useEffect(() => {
    if (showOffcanvas) {
      const onKeyDown = (e) => {
        if (e.key === "Escape") setShowOffcanvas(false);
      };
      document.addEventListener("keydown", onKeyDown);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = prev;
      };
    }
  }, [showOffcanvas]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setShowOffcanvas(false);
      navigate('/home', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }, [logout, loggingOut, navigate]);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      setShowOffcanvas(false);
    },
    [navigate]
  );

  const renderSessionButtons = (isMobile = false) => {
    if (isAuthenticated) {
      return (
        <Button
          texto={loggingOut ? "Cerrando..." : "Cerrar Sesión"}
          onClick={handleLogout}
          variant="session"
          disabled={loggingOut}
          className={isMobile ? "mb-2" : ""}
        />
      );
    }
    return (
      <>
        <Button
          texto="Iniciar Sesión"
          onClick={() => (isMobile ? handleNavigate("/login") : navigate("/login"))}
          variant="session"
          className={isMobile ? "mb-2" : ""}
        />
        <Button
          texto="Registrarse"
          onClick={() => (isMobile ? handleNavigate("/register") : navigate("/register"))}
          variant="session"
          className={isMobile ? "" : "ml-2"}
        />
      </>
    );
  };

  // Links centrales (visibilidad por rol/permisos)
  const links = [
    { label: "Home", path: "/home", show: () => isAuthenticated },
    { label: "Reseñas", path: "/resenias", show: () => isAuthenticated },
    { label: "Turnos", path: "/reserva", show: () => isAuthenticated },
    { label: "Reservas", path: "/mis-reservas", show: () => isAuthenticated },
    { label: "Preferencias", path: "/preferencias", show: () => isAuthenticated },
    { label: "Datos", path: "/mis-datos", show: () => isAuthenticated },
    { label: "Resultados", path: "/cargar-resultados", show: () => isAuthenticated && (canManageReservas(me) || permissions.includes('reservas.resultado.cargar')) },
    { label: "Panel", path: "/admin/dashboard", show: () => isAuthenticated && canManageUsers(me) },
  ];

  // Links visibles
  const visibleLinks = links.filter(link => link.show());

  // estilos (desktop: solo cambio de color -> yellow-400)
  const navButtonBase =
    "relative text-white font-semibold px-2 py-1 rounded transition-colors duration-300 text-sm xl:text-base " +
    "group hover:text-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
  const navButtonActive = "text-yellow-400";

  return (
    <>
      {/* NAVBAR */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 h-14 transition-all duration-700 ${
          scrolled
            ? "bg-slate-900/80 backdrop-blur-md shadow-md"
            : "bg-transparent"
        }`}
      >
        <div className="relative mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between">
          {/* Logo (Izquierda) */}
          <button
            onClick={() => navigate("/home")}
            className="flex items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 rounded"
            aria-label="Ir al inicio"
          >
            <img
              src={logoCompleto}
              alt="Boulevard81"
              className="mr-2 h-6 w-auto select-none"
              draggable={false}
            />
          </button>

          {/* Links (Centro) - SOLO DESKTOP */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-3">
              {visibleLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className={`${navButtonBase} ${isActive ? navButtonActive : ""}`}
                    style={{ position: "relative" }}
                    type="button"
                  >
                    {link.label}
                    <span
                      className={`pointer-events-none absolute left-0 -bottom-0.5 h-0.5 bg-yellow-400 transition-all duration-300 ${
                        isActive ? "w-full" : "w-0 group-hover:w-full"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sesión (Derecha) + Hamburguesa */}
          <div className="flex items-center">
            {/* Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {renderSessionButtons(false)}
            </div>

            {/* Mobile: botón hamburguesa */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowOffcanvas(true)}
                className="text-white hover:text-yellow-400 p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                aria-label="Abrir menú"
                aria-expanded={showOffcanvas}
                aria-controls="mobile-menu"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MENU MOBILE (fullscreen mejorado) */}
      <AnimatePresence>
        {showOffcanvas && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOffcanvas(false)}
              aria-hidden="true"
            />
            {/* Panel fullscreen */}
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 lg:hidden flex"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            >
              <div
                className="relative flex-1 bg-[#0D1B2A]"
                style={{
                  // Acento radial sutil amarillo
                  backgroundImage:
                    "radial-gradient(1000px 400px at 110% -20%, rgba(250, 204, 21, 0.12), transparent)"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cerrar */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowOffcanvas(false)}
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                    aria-label="Cerrar menú"
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Header con logo */}
                <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                  <button
                    onClick={() => { navigate("/home"); setShowOffcanvas(false); }}
                    className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 rounded"
                    aria-label="Ir al inicio"
                  >
                    <img src={logoCompleto} alt="Boulevard81" className="h-6 w-auto" />
                  </button>
                </div>

                {/* Navegación */}
                <nav className="px-6 mt-6">
                  <ul className="flex flex-col space-y-4">
                    {visibleLinks.map(link => {
                      const isActive = location.pathname === link.path;
                      return (
                        <li key={link.label}>
                          <button
                            type="button"
                            onClick={() => { navigate(link.path); setShowOffcanvas(false); }}
                            className={`w-full text-left relative py-3 text-2xl font-light tracking-wide transition-all duration-200 rounded-md
                              ${isActive ? "text-yellow-400" : "text-white"} 
                              hover:text-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60`}
                          >
                            {/* Indicador base */}
                            <span
                              className={`pointer-events-none absolute left-0 bottom-0 h-0.5 bg-yellow-400 transition-all duration-300 ${
                                isActive ? "w-full" : "w-0 group-hover:w-full"
                              }`}
                            />
                            {link.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* separador sutil */}
                  <div className="mt-8 h-px w-full bg-white/10" />

                  {/* Sesión (botones grandes) */}
                  <div className="mt-6">
                    {!isAuthenticated ? (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleNavigate("/login")}
                          className="w-full text-white text-lg font-light py-3 rounded-full border border-white/20 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                        >
                          Iniciar Sesión
                        </button>
                        <button
                          onClick={() => handleNavigate("/register")}
                          className="w-full text-slate-900 text-lg font-medium py-3 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                        >
                          Registrarse
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <button
                          onClick={handleLogout}
                          className="w-full text-white text-lg font-light py-3 rounded-full border border-white/20 hover:bg-red-500/10 hover:text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    )}
                  </div>
                </nav>

                {/* Footer mini */}
                <div className="px-6 py-8">
                  <p className="text-white/40 text-xs">© {new Date().getFullYear()} Boulevard81</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Espaciador para evitar superposición */}
      <div className="h-14" />
    </>
  );
}

export default CustomNavbar;