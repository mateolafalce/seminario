import React from 'react';
import Button from "../common/Button/Button";
import heroImageSrc from "../../assets/images/homeHeroPadel.jpg";

const HERO_IMAGE = heroImageSrc;
const TEXT_COLORS = {
  secondary: "text-gray-300"
};

export default function HeroSection({ isAuthenticated, navigationHandlers }) {
  return (
    <section 
      className="relative isolate overflow-hidden h-screen min-h-[700px] flex items-center -mt-[3.5rem]"
      role="banner"
      aria-labelledby="hero-title"
    >
      <img
        src={HERO_IMAGE}
        alt="Jugadores de pádel en una cancha"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gray-900/60 mix-blend-multiply -z-10" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-[3.5rem]">
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
  );
}