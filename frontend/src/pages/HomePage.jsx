import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import HeroSection from '../components/home/HeroSection';
import FeaturesSection from '../components/home/FeaturesSection';
import CTASection from '../components/home/CTASection';
import "../index.css";
import Footer from "../components/common/Footer/Footer";

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