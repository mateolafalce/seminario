import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'

function Pelota() {
  const { scene } = useGLTF('/object/Tennis_Ball.glb')
  const ref = useRef()

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    if (ref.current) {
      // Rotación continua en X e Y
      ref.current.rotation.x = Math.sin(time * 0.5) * 0.5   // bamboleo suave
      ref.current.rotation.y += 0.02                        // giro continuo
      ref.current.rotation.z = Math.cos(time * 0.3) * 1   // pequeña inclinación
    }
  })

  return <primitive object={scene} ref={ref} scale={60} />
}

export default function Pelota3D() {
  return (
    <Canvas style={{ height: 200, width: 200 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 0, -10]} />
      <Pelota />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  )
}
