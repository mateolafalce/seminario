import React, { useMemo } from 'react';

const BRAND_COLOR = "#eaff00";
const TEXT_COLORS = {
  secondary: "text-gray-300",
  accent: "text-gray-400"
};

export default function FeaturesSection() {
  // Features memorizados para mejor performance, chequeado?
  const features = useMemo(() => [
    {
      id: 1,
      name: 'Reserva Online Fácil',
      description: 'Encuentra y reserva tu cancha ideal en segundos. Filtra por horario y disponibilidad en tiempo real.',
      emoji: '📅',
    },
    {
      id: 2,
      name: 'Emparejamiento Inteligente',
      description: '¿Te falta gente para jugar? Nuestro sistema te conecta con jugadores de tu mismo nivel y preferencias.',
      emoji: '🤝',
    },
    {
      id: 3,
      name: 'Estadísticas y Progreso',
      description: 'Registra tus resultados, evalúa a tus compañeros y mira cómo mejoras partido a partido.',
      emoji: '📈',
    },
  ], []);

  return (
    <section 
      className="bg-gray-900 py-24 sm:py-32"
      aria-labelledby="features-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <header className="mx-auto max-w-2xl lg:text-center">
          <h2 
            id="features-title"
            className="text-base font-semibold leading-7"
            style={{ color: BRAND_COLOR }}
          >
            TODO LO QUE NECESITAS
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            La Experiencia de Pádel Más Completa
          </p>
          <p className={`mt-6 text-lg leading-8 ${TEXT_COLORS.secondary}`}>
            Desde la reserva hasta el post-partido, nuestra plataforma está diseñada para que solo te preocupes por disfrutar.
          </p>
        </header>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.id} className="relative pl-16 group">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div 
                    className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    <span 
                      className="text-2xl text-gray-900" 
                      role="img" 
                      aria-label={feature.name}
                    >
                      {feature.emoji}
                    </span>
                  </div>
                  {feature.name}
                </dt>
                <dd className={`mt-2 text-base leading-7 ${TEXT_COLORS.accent}`}>
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}