import React from "react";
import IconoAvatar from "../../assets/icons/iconoAvatar";

function Card({ onClick }) {
    return (
        <div
            className={'max-w-[32rem] mt-[5rem] mx-auto my-6 bg-gray-800 rounded-3xl shadow-lg cursor-pointer hover:shadow-2xl transition-shadow flex items-center border border-gray-700'}
            onClick={onClick}
        >
            <div className={'flex-shrink-0 pl-6 py-4'}>
                <IconoAvatar/>
            </div>
            <div className={'flex flex-col justify-center p-6 flex-1'}>
                <h5 className={'text-xl font-bold mb-2 text-center text-white'}>Listar Usuarios</h5>
                <p className={'text-gray-200 text-base text-center'}>
                    Visualiza y gestiona la lista de usuarios registrados en el sistema. Haz clic para ver más detalles.
                </p>
            </div>
        </div>
    );
}

export default Card;