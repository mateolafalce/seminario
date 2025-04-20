import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReservaTabla from '../components/ReservaTabla';
import { AuthContext } from '../components/AuthContext';

function Reserva() {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <p>No tienes permisos para ver esta página.</p>
  }

  return <ReservaTabla />;
}

export default Reserva;
