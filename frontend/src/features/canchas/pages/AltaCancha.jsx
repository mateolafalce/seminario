import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../auth/context/AuthContext'
import AuthForm from '../../auth/components/AuthForm'
import backendClient from '../../../shared/services/backendClient'
import ListarCanchas from './ListarCanchas'
import { canManageCanchas } from '../../../shared/utils/permissions'

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

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre de la cancha", tipo: "text", placeholder: "Ej: Cancha 1" }
  ]

  const handleSubmit = async (valores) => {
    setErrores({})
    setMensajeExito('')
    if (!valores.nombre || !valores.nombre.trim()) {
      setErrores({ nombre: "El nombre es obligatorio" })
      return
    }
    setLoading(true)
    try {
      const response = await backendClient.post('canchas/crear', { nombre: valores.nombre })
      if (response) {
        setMensajeExito('Cancha creada correctamente')
        setRefreshCanchas(r => !r) // trigger refresh
      } else {
        setErrores({ general: 'Error al crear la cancha' })
      }
    } catch (err) {
      setErrores({ general: err.message || 'Error de conexión con el servidor' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="max-w-md mx-auto p-8 my-5">
        <AuthForm
          titulo="Crear Nueva Cancha"
          campos={campos}
          onSubmit={handleSubmit}
          textoBoton="Crear Cancha"
          cargando={loading}
          errores={errores}
        >
          {mensajeExito && (
            <p className="text-green-700 text-center mt-4">{mensajeExito}</p>
          )}
        </AuthForm>
      </div>
    </div>
  )
}

export default AltaCancha