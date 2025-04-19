import React,{useState} from 'react'
import "../components/styles.css"
import VerUsuarios from '../components/usuarios/VerUsuarios'
import Card from '../components/Card'

function Admin() {
    const [showModal, setShowModal] = useState(false);
  
    const handleCardClick = () => {
      setShowModal(true);
    }
  
    const handleCloseModal = () => {
      setShowModal(false);
    }

    return(
        <>
        <Card onClick={handleCardClick}/>
        <VerUsuarios show={showModal} onHide={handleCloseModal}/>
        </>        
    )

}

export default Admin