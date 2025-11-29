import Button from "../../../shared/components/ui/Button/Button";

export default function CTASection({ isAuthenticated, navigationHandlers }) {
  if (isAuthenticated) return null;

  return (
    // Fondo oscuro con una luz amarilla potente central
    <section className="relative py-32 px-6 overflow-hidden bg-[#050b14]">
      
      {/* El "foco" de luz amarilla */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/30 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/pattern-grid.svg')] bg-center opacity-5 pointer-events-none"></div> {/* Opcional: si tuvieras un patrón sutil */}

      <div className="relative max-w-4xl mx-auto text-center z-10">
        
        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none mb-6 drop-shadow-lg">
          TU MEJOR PARTIDO <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">EMPIEZA AHORA.</span>
        </h2>
        
        <p className="text-slate-300 text-xl md:text-2xl font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
          No te quedes afuera de la comunidad deportiva más grande de la ciudad. Unite hoy a Boulevard81.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
          {/* Botón Principal: Amarillo Brillante */}
          <Button
            texto="Crear Cuenta Gratis"
            onClick={navigationHandlers.toRegister}
            // Usamos una clase personalizada para darle más punch que el 'primary' default
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-950 hover:from-yellow-300 hover:to-yellow-400 font-black py-4 px-10 text-lg rounded-full shadow-lg shadow-yellow-400/30 hover:scale-105 transition-all"
            size="lg"
          />
          
          {/* Botón Secundario: Transparente con borde claro */}
          <button
            onClick={navigationHandlers.toLogin}
            className="group relative px-10 py-4 rounded-full overflow-hidden font-bold text-lg text-white transition-all hover:text-yellow-400"
          >
             <span className="absolute inset-0 border-2 border-white/30 group-hover:border-yellow-400/60 rounded-full transition-colors"></span>
             <span className="relative">Iniciar Sesión</span>
          </button>
        </div>

      </div>
    </section>
  );
}