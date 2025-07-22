import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Button from "../components/common/Button/Button";
import "../index.css";

// Constantes para mejor mantenibilidad
const HERO_IMAGE = "/padel-hero-background.jpg";
const FALLBACK_IMAGE = "/2.jpg"; // Imagen de fallback que existe en public

const BRAND_COLOR = "#eaff00";
const TEXT_COLORS = {
  primary: "text-white",
  secondary: "text-gray-300",
  accent: "text-gray-400"
};

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [heroImageError, setHeroImageError] = useState(false);

  // Optimización: useMemo para evitar recrear el array en cada render
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

  // Handlers extraídos para mejor legibilidad
  const handleImageError = () => setHeroImageError(true);
  
  const navigationHandlers = useMemo(() => ({
    toLogin: () => navigate('/login'),
    toRegister: () => navigate('/register'),
  }), [navigate]);

  return (
    <div className='w-full bg-gray-900 text-white'>
      {/* --- HERO SECTION --- */}
      <section 
        className="relative isolate overflow-hidden h-screen min-h-[700px] flex items-center"
        role="banner"
        aria-labelledby="hero-title"
      >
        <img
          src={heroImageError ? FALLBACK_IMAGE : HERO_IMAGE}
          alt="Jugadores de pádel en una cancha"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          onError={handleImageError}
          loading="eager"
        />
        <div className="absolute inset-0 bg-gray-900/60 mix-blend-multiply -z-10" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl text-left">
            <h1 
              id="hero-title"
              className="text-4xl font-bold tracking-tight text-white sm:text-6xl drop-shadow-lg"
            >
              Tu Próximo Partido de Pádel Empieza Aquí
            </h1>
            <p className={`mt-6 text-lg leading-8 ${TEXT_COLORS.secondary}`}>
              Somos un complejo deportivo en La Plata. Reserva canchas, encuentra rivales de tu nivel y lleva tus estadísticas al siguiente nivel.
            </p>
            {!isAuthenticated && (
                <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-x-6">
                    <Button
                        texto='Reservar Cancha'
                        onClick={navigationHandlers.toLogin}
                        variant='primary'
                        className="w-full sm:w-auto"
                    />
                    <Button
                        texto='Buscar Partido →'
                        onClick={navigationHandlers.toLogin}
                        variant='secondary'
                        className="w-full sm:w-auto"
                    />
                </div>
            )}
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
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

      {/* --- FINAL CTA SECTION --- */}
      {!isAuthenticated && (
        <section 
          className="bg-gray-800"
          aria-labelledby="cta-title"
        >
            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:justify-between lg:px-8">
                <div>
                    <h2 
                      id="cta-title"
                      className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                    >
                        ¿Listo para jugar?
                        <br />
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                          Únete a la comunidad de Boulevard81 hoy.
                        </span>
                    </h2>
                </div>
                <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-x-6 lg:mt-0 lg:flex-shrink-0">
                     <Button
                        texto='Registrarse Gratis'
                        onClick={navigationHandlers.toRegister}
                        variant='primary'
                        className="w-full sm:w-auto"
                    />
                    <Button
                        texto='Iniciar Sesión'
                        onClick={navigationHandlers.toLogin}
                        variant='secondary'
                        className="w-full sm:w-auto"
                    />
                </div>
            </div>
        </section>
      )}
    </div>
  );
}