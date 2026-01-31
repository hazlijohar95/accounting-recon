import React from 'react'

/**
 * 3-point lighting setup for consistent logo rendering in Remotion.
 * Matches the lighting from the main brand components.
 */
export function RemotionLighting() {
  return (
    <>
      {/* Key light - main illumination */}
      <ambientLight intensity={0.6} />
      {/* Fill light - from front-right */}
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      {/* Back light - subtle rim lighting */}
      <directionalLight position={[-5, -5, 5]} intensity={0.3} />
      {/* Top light for depth */}
      <directionalLight position={[0, 10, 0]} intensity={0.2} />
    </>
  )
}
