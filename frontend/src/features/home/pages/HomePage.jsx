import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/context/AuthContext';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import CTASection from '../components/CTASection';
import "../../../styles/index.css";
import Footer from "../../../shared/components/layout/Footer/Footer";

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  
  const navigationHandlers = useMemo(() => ({
    toLogin: () => navigate('/login'),
    toRegister: () => navigate('/register'),
  }), [navigate]);

  return (
    <div className='w-full bg-gray-900 text-white'>
      <HeroSection 
        isAuthenticated={isAuthenticated} 
        navigationHandlers={navigationHandlers}
      />
      
      <FeaturesSection />
      
      <CTASection 
        isAuthenticated={isAuthenticated} 
        navigationHandlers={navigationHandlers}
      />

      <Footer/>
    </div>
  );
}