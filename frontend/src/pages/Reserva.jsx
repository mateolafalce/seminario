import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReservaTabla from '../components/ReservaTabla';
import { AuthContext } from '../components/AuthContext';

function Reserva() {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated ? <ReservaTabla /> : null;
}

export default Reserva;
