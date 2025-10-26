import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../../context/AuthContext'
import AuthForm from '../../common/AuthForm/AuthForm'
import backendClient from '../../../services/backendClient'

function CrearCanchaInline({ onCanchaCreada }) {
  const [errores, setErrores] = useState({})
  const [loading, setLoading] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const { handleUnauthorized } = useContext(AuthContext)
  const navigate = useNavigate()

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
        setTimeout(() => {
          if (onCanchaCreada) onCanchaCreada()
        }, 900)
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
  )
}

export default CrearCanchaInline