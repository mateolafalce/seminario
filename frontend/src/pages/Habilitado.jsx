import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MiToast from "../components/common/Toast/MiToast";
import { toast } from "react-toastify";

const Habilitado = () => {
  const navigate = useNavigate();

  useEffect(() => {
    toast(
      <MiToast 
        mensaje={"Tu cuenta ha sido habilitada\nSerás redirigido a la página de inicio de sesión en 5 segundos..."} 
        tipo="success" 
      />
    );
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div></div>
  );
};

export default Habilitado;