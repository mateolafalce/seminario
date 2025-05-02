import React from 'react'

function Card({ onClick }) {
    return (
        <div
            className="max-w-[32rem] mx-auto my-[1rem] bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow flex"
            onClick={onClick}
        >
            <div className="flex-shrink-0">
                <img
                    src="/user.jpg"
                    className="h-[8rem] w-[8rem] object-cover rounded-l-lg"
                    alt="Usuario"
                />
            </div>
            <div className="flex flex-col justify-center p-[1rem] flex-1">
                <h5 className="text-[1.25rem] font-semibold mb-[0.5rem] text-center text-gray-800">Listar Usuarios</h5>
                <p className="text-gray-600 text-[0.875rem]">
                    This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer...
                </p>
            </div>
        </div>
    )
}

export default Card