import React, { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../components/AuthContext'
import "../components/styles.css"

function HomePage(){
    const navigate = useNavigate()
    const {isAuthenticated} = useContext(AuthContext)
  
    return (
      <>
      <h1>Boulevard 81</h1>
      <div id="carouselExample" className="carousel slide">
      <div className="carousel-inner">
        <div className="carousel-item active">
          <img src="/CROUSEL.jpeg" className="d-block w-100" alt="..." />
        </div>
        <div className="carousel-item">
          <img src="/3.jpg" className="d-block w-100" alt="..." />
        </div>
        <div className="carousel-item">
          <img src="/2.jpg" className="d-block w-100" alt="..." />
        </div>
      </div>
      <button
        className="carousel-control-prev"
        type="button"
        data-bs-target="#carouselExample"
        data-bs-slide="prev"
      >
        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Previous</span>
      </button>
      <button
        className="carousel-control-next"
        type="button"
        data-bs-target="#carouselExample"
        data-bs-slide="next"
      >
        <span className="carousel-control-next-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Next</span>
      </button>
    </div>
          <p>Somos un complejo deportivo de la ciudad de La Plata, vas a poder
            alquilar canchar, tanto para entrenamientos como realizar
            torneos de paddel.
            Podrás ver tus estadísticas y acordar un turno con otros jugadores.
            Para poder usar nuestro servicio regístrese o inicie sesión.
        </p>
        {!isAuthenticated ? (
          <div className="d-grid gap-5 d-md-flex">
            <button type="button" className="btn btn-primary" onClick={ () => navigate('/login')}>Iniciar Sesión</button> 
            <button type="button" className="btn btn-primary" onClick={ () => navigate('/register')}>Registrarse</button> 
          </div>
      ) : (
        <>
        </>
      )}
      </>
    )
  }

export default HomePage