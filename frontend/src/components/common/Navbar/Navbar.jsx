import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import Button from "../Button/Button";
import logoCompleto from "../../../assets/icons/logoCompletoBlanco.svg";
import { motion, AnimatePresence } from "framer-motion";

// las redirecciones centrales
const centerLinks = [
  { label: "Home", path: "/home", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Reseñas", path: "/resenias", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Turnos", path: "/reserva", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Reservas", path: "/mis-reservas", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Preferencias", path: "/preferencias", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Datos", path: "/mis-datos", show: ({ isAuthenticated }) => isAuthenticated },
  { label: "Resultados", path: "/cargar-resultados", show: ({ isAuthenticated, isEmpleado }) => isAuthenticated && isEmpleado },
  { label: "Panel", path: "/admin/dashboard", show: ({ isAuthenticated, isAdmin }) => isAuthenticated && isAdmin },
];

function CustomNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
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
    setShowOffcanvas(false);
    window.location.replace("/home");
  };

  // Links visibles según rol
  const visibleLinks = centerLinks.filter(link =>
    link.show({ isAuthenticated, isAdmin, isEmpleado })
  );

  // ✅ SIN raya arriba: sin ring/shadow top
  //    • en top: transparente con degradado hacia abajo
  //    • scrolled: fondo blur + SOLO borde inferior
  const navWrapper = `fixed inset-x-0 top-0 z-50 transition-all duration-500
    ${scrolled
      ? "bg-slate-900/75 supports-[backdrop-filter]:backdrop-blur-xl border-b border-white/10"
      : "bg-gradient-to-b from-slate-900/0 to-slate-900/25 supports-[backdrop-filter]:backdrop-blur-0"
    }`;

  const navHeight = scrolled ? "h-14" : "h-16";

  return (
    <>
      {/* NAVBAR */}
      <nav
        className={`${navWrapper} ${navHeight} relative`}
      >
        {/* hairline inferior muy sutil SOLO cuando NO hay border */}
        {!scrolled && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5" />
        )}

        <div className={`relative mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8
                         flex items-center justify-between`}>

          {/* Logo */}
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={() => navigate("/home")}
            title="Boulevard81"
          >
            <img src={logoCompleto} alt="Boulevard81" className="h-6 sm:h-7 w-auto block" draggable={false}/>
          </div>

          {/* Links centrados (desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-1.5 rounded-full px-2 py-1
                            bg-white/5 ring-1 ring-white/10 supports-[backdrop-filter]:backdrop-blur-md
                            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
              {visibleLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className={`relative px-3 py-1.5 rounded-full text-sm font-semibold text-white/90 transition-colors
                               hover:text-amber-300 hover:bg-white/5 focus:outline-none
                               ${isActive ? "text-amber-300 bg-white/10 ring-1 ring-amber-300/20" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    style={{ fontFamily: "inherit" }}
                  >
                    {link.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Derecha (igual que antes) */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2">
              {isAuthenticated ? (
                <Button texto="Cerrar Sesión" onClick={handleLogout} variant="session" className="rounded-full !px-5 !py-1.5 font-semibold"/>
              ) : (
                <>
                  <Button texto="Iniciar Sesión" onClick={() => navigate("/login")} variant="session" className="rounded-full !px-5 !py-1.5 font-semibold"/>
                  <Button texto="Registrarse" onClick={() => navigate("/register")} variant="session" className="rounded-full !px-5 !py-1.5 font-semibold"/>
                </>
              )}
            </div>

            {/* Hamburguesa (mobile) */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowOffcanvas(true)}
                className="text-white/90 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
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

      {/* Offcanvas tal cual lo tenías… */}
      <AnimatePresence>
        {showOffcanvas && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden
                       bg-gradient-to-br from-[#0B1220] via-[#0D1B2A] to-[#111827]
                       ring-1 ring-white/10"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* cerrar */}
            <button
              onClick={() => setShowOffcanvas(false)}
              className="absolute top-7 right-7 text-white/70 hover:text-white transition-colors rounded-full p-2
                         hover:bg-white/5 ring-1 ring-white/10"
              aria-label="Cerrar menú"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* contenido */}
            <div className="h-full flex flex-col justify-center items-center px-8">
              <nav className="flex flex-col w-full max-w-sm space-y-4 mb-10">
                {visibleLinks.map(link => {
                  const isActive = location.pathname === link.path;
                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => { navigate(link.path); setShowOffcanvas(false); }}
                      className={`w-full text-center rounded-2xl px-6 py-3.5 text-lg font-semibold transition-all
                                  ring-1 ${isActive
                                    ? "text-amber-300 bg-white/10 ring-amber-300/25 shadow-[0_12px_40px_-12px_rgba(245,197,66,0.35)]"
                                    : "text-white/90 hover:text-amber-300 hover:bg-white/5 ring-white/10"
                                  }`}
                      style={{ fontFamily: "inherit" }}
                    >
                      {link.label}
                    </button>
                  );
                })}
              </nav>

              {/* sesión */}
              {!isAuthenticated ? (
                <div className="flex flex-col w-full max-w-sm space-y-4">
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full text-center rounded-2xl px-6 py-3 text-base font-semibold
                               text-white/90 hover:text-white transition-all ring-1 ring-white/10 hover:bg-white/5"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => navigate("/register")}
                    className="w-full text-center rounded-2xl px-6 py-3 text-base font-semibold
                               bg-amber-300 text-slate-900 hover:bg-amber-200 transition-colors shadow-[0_10px_30px_-10px_rgba(245,197,66,0.55)]"
                  >
                    Registrarse
                  </button>
                </div>
              ) : (
                <div className="flex flex-col w-full max-w-sm">
                  <button
                    onClick={handleLogout}
                    className="w-full text-center rounded-2xl px-6 py-3 text-base font-semibold
                               text-white/90 hover:text-rose-300 transition-all ring-1 ring-white/10 hover:bg-white/5"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-16" />
    </>
  );
}

export default CustomNavbar;