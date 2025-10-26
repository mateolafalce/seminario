import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import VerUsuarios from '../components/usuarios/VerUsuarios'
import Card from '../components/usuarios/Card'
import { AuthContext } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import { Navigate } from 'react-router-dom';
import { hasRole } from '../utils/permissions';

function Admin() {
    const [showModal, setShowModal] = useState(false);
    const { isAuthenticated, roles, permissions } = useContext(AuthContext);
    const me = { roles, permissions };
    const isAdmin = hasRole(me, 'admin');
    const navigate = useNavigate();

    if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;

    return(
        <>
            <Card onClick={() => setShowModal(true)} />
            <VerUsuarios show={showModal} onHide={() => setShowModal(false)} />

            {/* --- Contenido de GestionClientes añadido --- */}
            <div className="flex flex-col items-center justify-center mt-10 px-4">
                <div className="bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full border border-gray-700 p-10 flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Gestionar Clientes</h2>
                    <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
                        <Button
                            texto="Crear Cliente"
                            onClick={() => navigate('/register?admin=1')}
                        />
                        <Button
                            texto="Buscar Cliente"
                            onClick={() => navigate('/clientes/buscar')}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export default Admin