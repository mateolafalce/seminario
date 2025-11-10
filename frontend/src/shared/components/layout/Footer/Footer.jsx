import React from 'react';
import { FaMobileAlt, FaMapMarkerAlt, FaInstagram, FaWhatsapp } from "react-icons/fa";
import Pelota3D from './Pelota3D'
import "../../../../styles/Footer.css"
import logoCompleto from "../../../../assets/icons/logoCompleto.svg"; 



function Footer(){
    return (
<div className="w-full flex flex-col md:flex-row gap-10 md:justify-between bg-[#0d1b2a] border-t-10 border-[#e5ff00] p-4">
  <div className='border-t-10 border-x-2 border-b bg-gray-800/25 border-gray-800 rounded-full mx-auto md:mx-0'>
    <Pelota3D />
  </div>

  <div className="links text-center md:text-left">
    <a className='flex items-center justify-center md:justify-start gap-5 pb-5 text-[#e5ff00]' target='_blank' href="https://maps.app.goo.gl/cf4tQYD54Gic4s7b6">
      <FaMapMarkerAlt />
      <span>Ca. 131 y 68, B1910 La Plata, Provincia de Buenos Aires</span>
    </a>
    <a className='flex items-center justify-center md:justify-start gap-5 pb-5 text-[#e5ff00]' target='_blank' href="https://wa.me/542213041144" rel="noopener noreferrer">
      <FaWhatsapp />
      <span>Whatsapp</span>
    </a>
    <a className='flex items-center justify-center md:justify-start gap-5 text-[#e5ff00]' target='_blank' href="https://www.instagram.com/boulevard_81/">
      <FaInstagram />
      <span>Instagram</span>
    </a>
    <div className='pt-5 flex items-center justify-center md:justify-start gap-5 text-[#e5ff00]'>
      <p className='text-lg'>©</p>
      <p>Todos los derechos reservados</p>
    </div>
  </div>

  <div
    className='flex border-t-10 border-x-2 border-b bg-gray-800/25 gap-5 border-gray-800 rounded-full items-center select-none mx-auto md:mx-0'
    onClick={() => navigate("/home")}
  >
    <img
      src={logoCompleto}
      alt="Boulevard81 Logo"
      className='select-none'
      style={{ userSelect: "none", height: "200px", width: "200px", display: "block" }}
      draggable={false}
    />
  </div>
</div>
    )
}
export default Footer