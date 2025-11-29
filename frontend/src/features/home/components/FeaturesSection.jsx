import { HiCalendarDays, HiUsers, HiSparkles } from 'react-icons/hi2';

const features = [
  {
    icon: HiCalendarDays,
    title: "Reservas al Instante",
    desc: "Visualizá disponibilidad en tiempo real y asegurá tu cancha en segundos desde cualquier dispositivo."
  },
  {
    icon: HiUsers,
    title: "Comunidad Activa",
    desc: "Conectá con jugadores de tu nivel. Organizá partidos, sumate a torneos y desafiá tus límites."
  },
  {
    icon: HiSparkles,
    title: "Experiencia Premium",
    desc: "Instalaciones de primer nivel, iluminación profesional y el mejor ambiente para disfrutar del deporte."
  }
];

export default function FeaturesSection() {
  return (
    // Agregamos un gradiente sutil arriba para que se mezcle con el Hero
    <section className="relative bg-slate-950 py-24 px-6 overflow-hidden">
       {/* Luz de fondo ambiental sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-400/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto">
        
        {/* Encabezado de sección */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Potenciá tu juego.
          </h2>
          <div className="w-24 h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-600 mx-auto rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        </div>

        {/* Grid de Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              // Tarjeta con efecto Glassmorphism oscuro y hover luminoso
              <div key={index} className="group relative bg-slate-900/40 backdrop-blur-sm p-8 rounded-3xl border border-white/5 hover:border-yellow-400/30 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                
                {/* Brillo en hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Icono con resplandor */}
                <div className="relative w-16 h-16 mb-8">
                  <div className="absolute inset-0 bg-yellow-400/20 rounded-2xl blur-xl group-hover:bg-yellow-400/40 transition-colors duration-500" />
                  <div className="relative w-full h-full bg-slate-800/80 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-yellow-400/50 transition-colors">
                    <Icon className="w-8 h-8 text-yellow-400 transition-transform group-hover:scale-110" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed text-lg font-medium">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}