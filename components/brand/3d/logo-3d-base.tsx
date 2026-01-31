'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LOGO_RECTANGLES, EXTRUSION_DEPTH, type LogoRectangle } from './utils/geometry'

interface LogoRectangleMeshProps {
  rect: LogoRectangle
  color: THREE.Color
  scale?: number
  opacity?: number
  animate?: boolean
  delay?: number
}

function LogoRectangleMesh({
  rect,
  color,
  scale = 1,
  opacity = 1,
}: LogoRectangleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Center position for the rectangle
  const position: [number, number, number] = useMemo(() => [
    rect.x + rect.width / 2,
    -(rect.y + rect.height / 2), // Flip Y for Three.js
    rect.z,
  ], [rect])

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[rect.width, rect.height, EXTRUSION_DEPTH]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  )
}

export interface Logo3DBaseProps {
  /** Overall scale of the logo */
  scale?: number
  /** Color of the logo (hex string or Three.Color) */
  color?: string | THREE.Color
  /** Whether to animate on mount */
  animate?: boolean
  /** Optional group ref for external control */
  groupRef?: React.RefObject<THREE.Group | null>
  /** Children to render inside the logo group */
  children?: React.ReactNode
}

/**
 * Base 3D logo component with shared geometry and materials.
 * Renders the geometric "R" logo as extruded 3D rectangles.
 */
export function Logo3DBase({
  scale = 1,
  color = '#737373',
  animate = false,
  groupRef,
  children,
}: Logo3DBaseProps) {
  const internalRef = useRef<THREE.Group>(null)
  const ref = groupRef || internalRef

  const threeColor = useMemo(
    () => (color instanceof THREE.Color ? color : new THREE.Color(color)),
    [color]
  )

  return (
    <group ref={ref} scale={scale}>
      {LOGO_RECTANGLES.map((rect) => (
        <LogoRectangleMesh
          key={rect.id}
          rect={rect}
          color={threeColor}
          animate={animate}
        />
      ))}
      {children}
    </group>
  )
}

export interface AnimatedRectangleProps {
  rect: LogoRectangle
  color: THREE.Color
  delay: number
  entranceProgress: number
  hoverIntensity?: number
}

/**
 * Individual animated rectangle for advanced animations.
 * Supports entrance animation, hover effects, and custom transforms.
 */
export function AnimatedRectangle({
  rect,
  color,
  delay,
  entranceProgress,
  hoverIntensity = 0,
}: AnimatedRectangleProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  // Calculate position with animation offset
  const basePosition: [number, number, number] = useMemo(() => [
    rect.x + rect.width / 2,
    -(rect.y + rect.height / 2),
    rect.z,
  ], [rect])

  // Animate based on entrance progress and delay
  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Clamp delta for consistent animation
    const clampedDelta = Math.min(delta, 0.1)

    // Calculate local progress based on delay
    const localProgress = Math.max(0, Math.min(1, (entranceProgress - delay) / 0.4))

    // Scale animation
    const targetScale = localProgress
    const currentScale = meshRef.current.scale.x
    const newScale = currentScale + (targetScale - currentScale) * clampedDelta * 8

    meshRef.current.scale.setScalar(Math.max(0.001, newScale))

    // Hover effect on Z position
    const hoverZ = hoverIntensity * 0.05
    meshRef.current.position.z = basePosition[2] + hoverZ
  })

  return (
    <mesh ref={meshRef} position={basePosition} scale={0.001}>
      <boxGeometry args={[rect.width, rect.height, EXTRUSION_DEPTH]} />
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  )
}

/**
 * Hook to get theme-aware color for 3D materials.
 * Returns the appropriate color based on CSS custom properties.
 */
export function useThemeColor(): string {
  // Default neutral gray - matches brand primary
  return '#737373'
}

/**
 * Lighting setup for consistent logo rendering.
 */
export function LogoLighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, 5]} intensity={0.3} />
    </>
  )
}
