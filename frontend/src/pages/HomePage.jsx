import React, { useContext, useEffect } from 'react'
import Botones from '../components/Boton'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../components/AuthContext'

function HomePage(){
    const navigate = useNavigate()
    const {isAuthenticated} = useContext(AuthContext)
  
    return (
      <>
      <h1>Boulevard 81</h1>
          <p>Somos un complejo deportivo de la ciudad de La Plata, vas a poder
            alquilar canchar, tanto para entrenamientos como realizar
            torneos de paddel.
            Podrás ver tus estadísticas y acordar un turno con otros jugadores.
            Para poder usar nuestro servicio regístrese o inicie sesión.
        </p>
        {!isAuthenticated ? (
          <div className="btn-container">
          < Botones texto="Iniciar Sesión" onClick={ () => navigate('/login')}/> < Botones onClick={ () => navigate('/register')} texto="Registrarse"/>
          </div>
      ) : (
        <>
        </>
      )}
      </>
    )
  }

export default HomePage