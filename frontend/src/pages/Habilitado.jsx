import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RedirectMessage from '../components/usuarios/MensajeRedireccion';

const Habilitado = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000); // Redirects after 5 seconds

    return () => clearTimeout(timer); // Cleanup the timer on component unmount
  }, [navigate]);

  return (
    <div className="enabled-page">
      <RedirectMessage />
    </div>
  );
};

export default Habilitado;