import { HiCalendarDays, HiUsers, HiChartBarSquare } from 'react-icons/hi2';

export default function FeaturesSection() {
  const features = [
    {
      id: 1,
      name: 'Reserva Online Fácil',
      description: 'Encuentra y reserva tu cancha ideal en segundos. Filtra por horario y disponibilidad en tiempo real.',
      icon: HiCalendarDays,
    },
    {
      id: 2,
      name: 'Emparejamiento Inteligente',
      description: '¿Te falta gente para jugar? Nuestro sistema te conecta con jugadores de tu mismo nivel y preferencias.',
      icon: HiUsers,
    },
    {
      id: 3,
      name: 'Estadísticas y Progreso',
      description: 'Registra tus resultados, evalúa a tus compañeros y mira cómo mejoras partido a partido.',
      icon: HiChartBarSquare,
    },
  ];

  return (
    <section className="bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-[#eaff00]">
            TODO LO QUE NECESITAS
          </h2>
          <p className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            La Experiencia de Pádel Más Completa
          </p>
          <p className="mt-6 text-lg text-gray-300">
            Desde la reserva hasta el post-partido, nuestra plataforma está diseñada para que solo te preocupes por disfrutar.
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.id} className="relative pl-16 group">
                  <div className="text-base font-semibold leading-7 text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaff00] transition-transform duration-200 group-hover:scale-110">
                      <IconComponent 
                        className="h-6 w-6 text-gray-900" 
                        aria-hidden="true"
                      />
                    </div>
                    {feature.name}
                  </div>
                  <p className="mt-2 text-base text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}