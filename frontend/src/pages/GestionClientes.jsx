import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import Button from '../components/common/Button/Button'

function GestionClientes() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useContext(AuthContext);

  if (!isAuthenticated || !isAdmin) {
    return <p className="text-center text-red-400 mt-10">No tienes permisos para ver esta página.</p>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-4">
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
  )
}

export default GestionClientes;
