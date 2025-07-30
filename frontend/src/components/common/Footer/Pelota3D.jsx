import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'

function Pelota() {
  const { scene } = useGLTF('/object/Tennis_Ball.glb')
  const ref = useRef()

  // Animación: se mueve un poco al hacer scroll
  useFrame(() => {
    const scroll = window.scrollX // sensibilidad
    if (ref.current) {
      ref.current.rotation.x += 0.015
      ref.current.position.x = Math.sin(scroll)
    }
  })

  return <primitive object={scene} ref={ref} scale={60} />
}

export default function Pelota3D() {
  return (
    <Canvas style={{ height: 200, width: 200 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 0, -10]} />
      <Pelota />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  )
}
