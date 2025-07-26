import React, { useState, useEffect } from 'react'
import AuthForm from '../../common/AuthForm/AuthForm'

function EditarCanchaModal({ cancha, onClose, onSubmit, loading, errores }) {
  const [valores, setValores] = useState({ nombre: cancha?.nombre || '' })

  // Sincroniza valores cuando cambia la cancha a editar
  useEffect(() => {
    setValores({ nombre: cancha?.nombre || '' })
  }, [cancha])

  const campos = [
    { nombre: "nombre", etiqueta: "Nombre de la cancha", tipo: "text", placeholder: "Ej: Cancha 1" }
  ]

  return (
    <div className="p-4">
      <AuthForm
        titulo="Modificar Cancha"
        campos={campos}
        valoresIniciales={valores}
        onChange={setValores}
        onSubmit={onSubmit}
        textoBoton="Guardar Cambios"
        cargando={loading}
        errores={errores}
      />
      <button
        className="mt-4 text-gray-400 hover:text-gray-200"
        onClick={onClose}
      >
        Cancelar
      </button>
    </div>
  )
}

export default EditarCanchaModal