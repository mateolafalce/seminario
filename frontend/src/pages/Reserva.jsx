import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import ReservaTabla from '../components/usuarios/ReservaTabla';

function Reserva() {
  const { isAuthenticated, setRedirectAfterLogin, authReady } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return; 
    if (!isAuthenticated) {
      setRedirectAfterLogin(location.pathname + location.search);
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location, navigate, setRedirectAfterLogin, authReady]);

  if (!authReady) return null;
  if (!isAuthenticated) return null;

  return <ReservaTabla />;
}

export default Reserva;
