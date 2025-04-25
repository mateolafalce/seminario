import React, {useState} from 'react'
import VerUsuarios from "./VerUsuarios";
import "../../styles/Styles.css";

function Card(){
    const [showModal,setShowModal] =useState(false)

    const handleCardClick=() =>{
        setShowModal(true)
    }
    const handleCloseModal = () =>{
        setShowModal(false)
    }
    return(
        <>
       <div className="card mb-3 cursor tamanio " onClick={handleCardClick}>
            <div className="row g-0">
                <div className="col-md-4">
                    <img src="/user.jpg" className="img-fluid rounded-start" alt="..."/>
                </div>
                <div className="col-md-8">
                    <div className="card-body">
                        <h5 className="card-title">Listar Usuarios</h5>
                        <p className="card-text">This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</p>
                    </div>
                </div>
            </div>
        </div>
        <VerUsuarios show={showModal} onHide={handleCloseModal}/>
        </>
    )
}

export default Card