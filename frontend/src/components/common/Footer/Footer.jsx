import React from 'react';
import { FaMobileAlt, FaMapMarkerAlt, FaInstagram, FaWhatsapp } from "react-icons/fa";
import Pelota3D from './Pelota3D'
import "../../../../src/styles/Footer.css"
import logoCompleto from "../../../../src/assets/icons/logoCompleto.svg"; 



function Footer(){
    return (
        <div className="
        w-full flex gap-10 
        justify-between bg-[#0d1b2a] 
        border-t-10 
        border-[#e5ff00] 
        p-4">
            <div className='
            border-t-10 border-x-2 border-b 
            bg-gray-800/25
            border-gray-800 rounded-full'>
                <Pelota3D /> {/* Aquí la pelota 3D */}
            </div>
            <div className="links">
            <a className='flex gap-5 pb-5' target='_blank' href="https://maps.app.goo.gl/cf4tQYD54Gic4s7b6">
                <p className='text-[#e5ff00]'>
                    <FaMapMarkerAlt/>
                </p>
                <p className='text-[#e5ff00] '>
                    Ca. 131 y 68, B1910 La Plata, Provincia de Buenos Aires
                </p>
            </a>
            <a className='flex gap-5 text-[#e5ff00] pb-5' target='_blank' href="https://wa.me/542213041144" rel="noopener noreferrer">
                <p className='text-[#e5ff00]'>
                    <FaWhatsapp/>
                </p>
                <p className='text-[#e5ff00] '>
                    Whatsapp
                </p>
            </a>
            <a className='flex gap-5 text-[#e5ff00]' target='_blank' href="https://www.instagram.com/boulevard_81/">
                <p className='text-[#e5ff00]'>
                    <FaInstagram/>
                </p>
                <p className='text-[#e5ff00] '>
                    Instagram
                </p>
            </a>
            </div>
            <div
                className='flex 
                border-t-10 border-x-2 border-b 
                bg-gray-800/25
                gap-5 border-gray-800
                rounded-full items-center 
                select-none'
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


/*
que aparezca un pelota que se mueva cuando sube y baja la pestania
*/