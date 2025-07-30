import React from 'react';
import { FaMobileAlt, FaMapMarkerAlt, FaInstagram, FaWhatsapp } from "react-icons/fa";
import Pelota3D from './Pelota3D'
import "../../../../src/styles/Footer.css"
import logoCompleto from "../../../../src/assets/icons/logoCompleto.svg"; 



function Footer(){
    return (
        <div className="container flex gap-10 justify-between bg-[#e5ff00]">
            <div>
                <Pelota3D /> {/* Aquí la pelota 3D */}
            </div>
            <div className="links">
            <a className='flex gap-5' target='_blank' href="https://maps.app.goo.gl/cf4tQYD54Gic4s7b6">
                <p>
                    <FaMapMarkerAlt/>
                </p>
                <p>
                    Ca. 131 y 68, B1910 La Plata, Provincia de Buenos Aires
                </p>
            </a>
            <a className='flex gap-5' target='_blank' href="https://wa.me/542213041144" rel="noopener noreferrer">
                <p>
                    <FaWhatsapp/>
                </p>
                <p>
                    Whatsapp
                </p>
            </a>
            <a className='flex gap-5' target='_blank' href="https://www.instagram.com/boulevard_81/">
                <p>
                    <FaInstagram/>
                </p>
                <p>
                    Instagram
                </p>
            </a>
            </div>
            <div
                className='flex items-center cursor-pointer select-none'
                onClick={() => navigate("/home")}
                >
                <img
                    src={logoCompleto}
                    alt="Boulevard81 Logo"
                    className='mr-[0.5rem] select-none'
                    style={{ userSelect: "none", height: "5.5rem", width: "auto", display: "block" }}
                    draggable={false}
                />
            </div>
        </div>
    )
}
export default Footer


/*
que aparezca un pelota que se mueva cuando sube y baja la pestania
*/