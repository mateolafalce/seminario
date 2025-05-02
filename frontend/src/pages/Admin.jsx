import React,{ useContext, useState} from 'react'
import VerUsuarios from '../components/usuarios/VerUsuarios'
import Card from '../components/usuarios/Card'
import { AuthContext } from '../context/AuthContext';

function Admin() {
    const [showModal, setShowModal] = useState(false);
    const { isAuthenticated, isAdmin } = useContext(AuthContext);

    if (!isAuthenticated || !isAdmin) {
      return <p>No tienes permisos para ver esta página.</p>
    }

    return(
        <>
        <Card onClick={() => setShowModal(true)} />
        <VerUsuarios show={showModal} onHide={() => setShowModal(false)} />
        </>
    )
}

export default Admin