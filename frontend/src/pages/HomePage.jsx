import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Button from "../components/common/Button/Button";
import Carousel from "../components/common/Carousel/Carousel";
import "../index.css";

const images = ["/CROUSEL.jpeg", "/3.jpg", "/2.jpg"]; // Asegúrate que existan en public/

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div className='flex flex-col items-center justify-start px-2 mt-8 mb-[3rem] h-full'>
      <h1 className='text-4xl font-extrabold text-center text-white mb-8 tracking-wide drop-shadow-lg'>Boulevard81</h1>
      <Carousel images={images} />
      <p className='text-gray-200 text-lg text-center mb-10 max-w-2xl mt-10'>
        Somos un complejo deportivo de la ciudad de La Plata. Podrás alquilar canchas para entrenamientos o torneos de pádel, ver tus estadísticas y coordinar turnos con otros jugadores.<br />
        <span className='font-bold text-[#eaff00] block mt-8'>¡Regístrate o inicia sesión para comenzar!</span>
      </p>
      {!isAuthenticated && (
        <div className='flex flex-col mt-[3rem] md:flex-row gap-4 justify-center'>
          <Button
            texto='Iniciar Sesión'
            onClick={() => navigate('/login')}
          />
          <Button
            texto='Registrarse'
            onClick={() => navigate('/register')}
          />
        </div>    
      )}
    </div>
  );
}
