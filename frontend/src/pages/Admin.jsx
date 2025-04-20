import React,{ useContext, useState} from 'react'
import "../styles/Styles.css"
import VerUsuarios from '../components/usuarios/VerUsuarios'
import Card from '../components/Card'
import { AuthContext } from '../components/AuthContext';

function Admin() {
    const [showModal, setShowModal] = useState(false);
    const { isAuthenticated, isAdmin } = useContext(AuthContext);

    if (!isAuthenticated || !isAdmin) {
      return <p>No tienes permisos para ver esta página.</p>
    }

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