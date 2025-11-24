import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../auth/context/AuthContext'
import backendClient from '../../../shared/services/backendClient'
import ListarCanchas from './ListarCanchas'
import { canManageCanchas } from '../../../shared/utils/permissions'
import CanchaForm from "../components/CanchaForm"

function AltaCancha({ refresh }) {
  const [errores, setErrores] = useState({})
  const [loading, setLoading] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [refreshCanchas, setRefreshCanchas] = useState(false)
  const { isAuthenticated, roles, permissions } = useContext(AuthContext)
  const me = { roles, permissions }
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 text-lg">Necesitas iniciar sesión para ver esta página.</p>
        <button 
          onClick={() => navigate('/login')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-200"
        >
          Ir al Login
        </button>
      </div>
    )
  }

  if (!canManageCanchas(me)) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 text-lg">No tienes permisos de administrador para ver esta página.</p>
        <button 
          onClick={() => navigate('/home')}
          className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition duration-200"
        >
          Volver al Home
        </button>
      </div>
    )
  }

  const handleSubmit = async (payload) => {
    setErrores({})
    setMensajeExito('')

    const nombre = (payload?.nombre || '').trim()
    if (!nombre) {
      setErrores({ nombre: "El nombre es obligatorio" })
      return
    }

    setLoading(true)
    try {
      // Armamos el body que espera tu backend (CanchaCreate)
      const body = {
        nombre,
        descripcion: (payload.descripcion || '').trim(),
        imagen_url: (payload.imagen_url || '').trim(),
        habilitada: payload.habilitada ?? true,
      }

      const response = await backendClient.post('canchas/crear', body)

      if (response) {
        setMensajeExito('Cancha creada correctamente')
        setRefreshCanchas(r => !r) // trigger refresh
      } else {
        setErrores({ general: 'Error al crear la cancha' })
      }
    } catch (error) {
      const mensaje =
        error?.data?.detail ||
        error?.detail ||
        error?.message ||
        'Error de conexión con el servidor'
      setErrores({ general: mensaje })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="max-w-md mx-auto p-8 my-5">
        <h1 className="text-2xl font-semibold text-gray-100 mb-4">
          Crear Nueva Cancha
        </h1>

        <CanchaForm
          onSubmit={handleSubmit}
          submitText="Crear Cancha"
          loading={loading}
          erroresExternos={errores}
        />

        {mensajeExito && (
          <p className="text-green-700 text-center mt-4">
            {mensajeExito}
          </p>
        )}
      </div>
    </div>
  )
}

export default AltaCancha