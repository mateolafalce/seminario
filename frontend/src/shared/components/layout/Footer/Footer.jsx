import React from "react";
import { FaInstagram, FaWhatsapp, FaFacebookF, FaTwitter, FaArrowRight, FaEnvelope } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Pelota3D from "./Pelota3D";
import logoBlanco from "../../../../assets/icons/logoCompletoBlanco.svg";

function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="relative bg-[#050b14] text-white pt-24 pb-12 overflow-hidden font-sans">
      
      {/* --- FONDO DECORATIVO & PELOTA GIGANTE --- */}
      {/* Borde superior neón */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-600/50 via-yellow-400 to-yellow-600/50 shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
      
      {/* Luz ambiental azulada */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* AQUÍ ESTÁ LA MAGIA: Pelota Gigante de Fondo */}
      <div className="absolute -bottom-64 -right-20 w-[800px] h-[800px] pointer-events-none select-none z-0 opacity-[0.15] mix-blend-lighten filter grayscale-[30%] brightness-75">
         <Pelota3D />
      </div>


      {/* --- CONTENIDO PRINCIPAL (z-index para que esté sobre la pelota) --- */}
      <div className="relative z-10 mx-auto max-w-7xl px-8 lg:px-12">
        
        {/* GRID PRINCIPAL (4 Columnas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-8 mb-20">
          
          {/* 1. MARCA Y REDES (Ocupa 4 columnas en desktop) */}
          <div className="lg:col-span-4 space-y-8">
            <button onClick={() => navigate("/home")} className="block focus:outline-none group">
              <img src={logoBlanco} alt="Boulevard81" className="h-8 w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-slate-400 text-base leading-relaxed pr-6">
              El complejo deportivo más avanzado de La Plata. Elevamos tu juego con tecnología, instalaciones premium y una comunidad apasionada.
            </p>
            
            <div className="flex gap-4 pt-2">
               <SocialButton href="#" icon={<FaInstagram size={20} />} color="hover:bg-[#E1306C] hover:border-[#E1306C]" label="Instagram" />
               <SocialButton href="https://wa.me/542213041144" icon={<FaWhatsapp size={20} />} color="hover:bg-[#25D366] hover:border-[#25D366]" label="Whatsapp" />
               <SocialButton href="#" icon={<FaFacebookF size={18} />} color="hover:bg-[#1877F2] hover:border-[#1877F2]" label="Facebook" />
            </div>
          </div>

          {/* 2. LINKS RÁPIDOS (Ocupa 2 columnas) */}
          <div className="lg:col-span-2 lg:ml-auto">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-yellow-400 inline-block"></span> Navegación
            </h3>
            <ul className="space-y-5 text-sm font-medium">
                <FooterLink onClick={() => navigate("/reserva")}>Reservar Turno</FooterLink>
                <FooterLink onClick={() => navigate("/home")}>Instalaciones</FooterLink>
                <FooterLink href="#">Torneos Activos</FooterLink>
                <FooterLink href="#">Ranking</FooterLink>
            </ul>
          </div>

          {/* 3. CLUB & SOPORTE (Ocupa 3 columnas) */}
          <div className="lg:col-span-3 lg:pl-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-yellow-400 inline-block"></span> Info Útil
            </h3>
            <ul className="space-y-5 text-sm font-medium">
                <FooterLink href="#">Escuela de Pádel</FooterLink>
                <FooterLink href="#">Membresías</FooterLink>
                <FooterLink href="#">Reglamento</FooterLink>
                <li className="pt-4">
                    <a href="mailto:info@boulevard81.com" className="group flex items-center gap-3 text-slate-400 hover:text-yellow-400 transition-colors">
                        <span className="p-2 bg-slate-900 rounded-lg group-hover:bg-yellow-400/10 transition-colors">
                            <FaEnvelope />
                        </span>
                        info@boulevard81.com
                    </a>
                </li>
            </ul>
          </div>

          {/* 4. NEWSLETTER (Ocupa 3 columnas) */}
          <div className="lg:col-span-3 relative">
             {/* Pequeño acento visual detrás del newsletter */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-transparent rounded-2xl -m-6 -z-10 border border-white/5 pointer-events-none"></div>

            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">
                Unite al Club
            </h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Recibí noticias, accesos prioritarios a torneos y descuentos exclusivos.
            </p>
            
            <form className="flex relative">
                <input 
                    type="email" 
                    placeholder="Tu correo electrónico" 
                    className="w-full bg-[#0a111c] border border-slate-800 text-white text-sm rounded-l-xl py-3.5 px-4 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 outline-none transition-all placeholder-slate-600"
                    required
                />
                <button type="submit" className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 rounded-r-xl transition-colors flex items-center justify-center">
                    <FaArrowRight />
                </button>
            </form>
          </div>

        </div>

        {/* BARRA INFERIOR */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-slate-500 font-medium">
                © {new Date().getFullYear()} Boulevard81. Todos los derechos reservados.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <a href="#" className="hover:text-yellow-400 transition-colors">Privacidad</a>
                <a href="#" className="hover:text-yellow-400 transition-colors">Términos</a>
                <a href="#" className="hover:text-yellow-400 transition-colors">Cookies</a>
            </div>
        </div>
      </div>
    </footer>
  );
}

// --- Componentes Auxiliares ---

function FooterLink({ children, onClick, href }) {
    const Component = onClick ? 'button' : 'a';
    return (
        <li>
            <Component 
                onClick={onClick} 
                href={href}
                className="text-slate-400 hover:text-white hover:translate-x-1 transition-all block text-left w-full group"
            >
                <span className="inline-block text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity mr-2">-</span>
                {children}
            </Component>
        </li>
    );
}

function SocialButton({ icon, href, color, label }) {
    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noreferrer"
            aria-label={label}
            className={`w-11 h-11 rounded-xl bg-[#0a111c] border border-slate-800 flex items-center justify-center text-slate-400 transition-all duration-300 ${color} hover:text-white hover:-translate-y-1 shadow-md hover:shadow-xl`}
        >
            {icon}
        </a>
    );
}

export default Footer;