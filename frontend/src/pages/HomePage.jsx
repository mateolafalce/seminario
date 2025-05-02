import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Button from "../components/common/Button/Button";

const images = [
  "/CROUSEL.jpeg",
  "/3.jpg",
  "/2.jpg"
];

function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [slideDirection, setSlideDirection] = useState(""); // "left" or "right"
  const [animating, setAnimating] = useState(false);

  const changeSlide = (nextIdx, direction) => {
    if (animating || nextIdx === current) return;
    setPrev(current);
    setSlideDirection(direction);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(nextIdx);
      setSlideDirection("");
      setAnimating(false);
      setPrev(null);
    }, 400);
  };

  const prevSlide = () => changeSlide((current - 1 + images.length) % images.length, "left");
  const nextSlide = () => changeSlide((current + 1) % images.length, "right");

  return (
    <div className="flex flex-col items-center px-2 pt-10">
      <h1 className="text-4xl font-extrabold text-center text-white-100 mb-8 tracking-wide drop-shadow-lg">Boulevard81</h1>
      <div className="relative w-full max-w-xl mb-8 overflow-hidden h-64">
        {/* Imagen anterior (animando salida) */}
        {animating && prev !== null && (
          <img
            src={images[prev]}
            alt={`slide-prev`}
            className={`slide-img ${slideDirection === "left" ? "slide-out-left" : "slide-out-right"}`}
          />
        )}
        {/* Imagen actual (animando entrada o estática) */}
        <img
          src={images[current]}
          alt={`slide-${current}`}
          className={`slide-img ${animating
            ? (slideDirection === "left" ? "slide-in-left" : "slide-in-right")
            : ""}`}
        />
        <button
          onClick={prevSlide}
          className="absolute top-1/2 left-4 -translate-y-1/2 bg-[#eaff00] text-gray-900 rounded-full p-2 shadow hover:bg-yellow-300 transition"
          aria-label="Anterior"
        >
          &#8592;
        </button>
        <button
          onClick={nextSlide}
          className="absolute top-1/2 right-4 -translate-y-1/2 bg-[#eaff00] text-gray-900 rounded-full p-2 shadow hover:bg-yellow-300 transition"
          aria-label="Siguiente"
        >
          &#8594;
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`block w-3 h-3 rounded-full ${idx === current ? "bg-[#eaff00]" : "bg-gray-500"}`}
            />
          ))}
        </div>
      </div>
      <p className="text-gray-200 text-lg text-center mb-10 max-w-2xl">
        Somos un complejo deportivo de la ciudad de La Plata. Podrás alquilar canchas para entrenamientos o torneos de pádel, ver tus estadísticas y coordinar turnos con otros jugadores.<br />
        <span className="font-bold text-[#eaff00]">¡Regístrate o inicia sesión para comenzar!</span>
      </p>
      {!isAuthenticated && (
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Button
            texto="Iniciar Sesión"
            onClick={() => navigate("/login")}
            className="w-full md:w-auto bg-[#eaff00] hover:bg-yellow-300 text-gray-900 font-bold py-3 px-8 rounded-full shadow-lg transition"
          />
          <Button
            texto="Registrarse"
            onClick={() => navigate("/register")}
            className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-[#eaff00] font-bold py-3 px-8 rounded-full shadow-lg border-2 border-[#eaff00] transition"
          />
        </div>
      )}
    </div>
  );
}

export default HomePage;