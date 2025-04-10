import React from 'react'
import './botones.css'

const Botones = ({texto, onClick }) => {
    return(
        <button className="btn" onClick={onClick}>{texto}</button>
    )
}

export default Botones