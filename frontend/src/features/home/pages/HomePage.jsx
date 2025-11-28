import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/context/AuthContext';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import CTASection from '../components/CTASection';
// Asegúrate de que la ruta al Footer sea la correcta en tu proyecto
import Footer from "../../../shared/components/layout/Footer/Footer";

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  
  // Memoizamos los handlers para evitar recrearlos en cada render
  const navigationHandlers = useMemo(() => ({
    toLogin: () => navigate('/login'),
    toRegister: () => navigate('/register'),
    toReservas: () => navigate('/reserva'),
  }), [navigate]);

  return (
    // Usamos el color de fondo más oscuro para unificar todo
    <div className='w-full flex flex-col min-h-screen bg-[#020617]'>
      
      <HeroSection 
        isAuthenticated={isAuthenticated} 
        navigationHandlers={navigationHandlers}
      />
      
      {/* Las nuevas secciones manejan sus propios fondos y transiciones */}
      <FeaturesSection />
      
      <CTASection 
        isAuthenticated={isAuthenticated} 
        navigationHandlers={navigationHandlers}
      />

      <Footer/>
    </div>
  );
}