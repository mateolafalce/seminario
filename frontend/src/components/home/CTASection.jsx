import React from 'react';
import Button from "../common/Button/Button";

export default function CTASection({ isAuthenticated, navigationHandlers }) {
  // Solo mostrar si el usuario NO está autenticado
  if (isAuthenticated) return null;

  return (
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
              Únite a la comunidad de Boulevard81 hoy.
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
  );
}