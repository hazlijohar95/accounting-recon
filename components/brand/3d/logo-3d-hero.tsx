'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { LogoMark } from '../logo-mark'
import { LOGO_RECTANGLES, EXTRUSION_DEPTH, STAGGER_DELAY, type LogoRectangle } from './utils/geometry'
import { easeOutCubic, clamp, lerp } from './utils/easing'
import { LogoLighting } from './logo-3d-base'

interface HeroRectangleProps {
  rect: LogoRectangle
  index: number
  color: THREE.Color
  entranceProgress: number
  mousePosition: { x: number; y: number }
  isMobile: boolean
}

function HeroRectangle({
  rect,
  index,
  color,
  entranceProgress,
  mousePosition,
  isMobile,
}: HeroRectangleProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [currentScale, setCurrentScale] = useState(0)

  const basePosition: [number, number, number] = useMemo(() => [
    rect.x + rect.width / 2,
    -(rect.y + rect.height / 2),
    rect.z,
  ], [rect])

  // Calculate delay for staggered entrance
  const delay = (index * STAGGER_DELAY) / 1000 // Convert to seconds

  useFrame((_, delta) => {
    if (!meshRef.current) return

    const clampedDelta = Math.min(delta, 0.1)

    // Entrance animation
    const localProgress = clamp((entranceProgress - delay) / 0.4, 0, 1)
    const easedProgress = easeOutCubic(localProgress)

    // Smooth scale transition
    const targetScale = easedProgress
    const newScale = lerp(currentScale, targetScale, clampedDelta * 8)
    setCurrentScale(newScale)
    meshRef.current.scale.setScalar(Math.max(0.001, newScale))

    // Mouse tilt effect (disabled on mobile)
    if (!isMobile && localProgress > 0.9) {
      const tiltX = mousePosition.y * 0.1
      const tiltY = mousePosition.x * 0.1
      meshRef.current.rotation.x = lerp(meshRef.current.rotation.x, tiltX, clampedDelta * 4)
      meshRef.current.rotation.y = lerp(meshRef.current.rotation.y, tiltY, clampedDelta * 4)
    }
  })

  return (
    <mesh ref={meshRef} position={basePosition} scale={0.001}>
      <boxGeometry args={[rect.width, rect.height, EXTRUSION_DEPTH]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  )
}

interface Logo3DHeroSceneProps {
  color: string
  isMobile: boolean
}

function Logo3DHeroScene({ color, isMobile }: Logo3DHeroSceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [entranceProgress, setEntranceProgress] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  // Handle entrance animation
  useEffect(() => {
    const startTime = Date.now()
    const duration = 1500 // 1.5s total entrance

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setEntranceProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [])

  // Handle mouse movement
  useEffect(() => {
    if (isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      setMousePosition({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isMobile])

  // Idle rotation
  useFrame((_, delta) => {
    if (!groupRef.current || entranceProgress < 1) return

    const clampedDelta = Math.min(delta, 0.1)
    groupRef.current.rotation.y += 0.1 * clampedDelta
  })

  return (
    <>
      <LogoLighting />
      <group ref={groupRef}>
        {LOGO_RECTANGLES.map((rect, index) => (
          <HeroRectangle
            key={rect.id}
            rect={rect}
            index={index}
            color={threeColor}
            entranceProgress={entranceProgress}
            mousePosition={mousePosition}
            isMobile={isMobile}
          />
        ))}
      </group>
    </>
  )
}

export interface Logo3DHeroProps {
  /** Size of the canvas */
  size?: number
  /** Color of the logo */
  color?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Hero variant of the 3D logo for landing pages.
 * Features entrance animation, subtle idle rotation, and mouse interaction.
 */
export function Logo3DHero({
  size = 400,
  color = '#737373',
  className,
}: Logo3DHeroProps) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()

  // Fallback to static logo for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ width: size, height: size }}>
        <LogoMark size={size * 0.6} />
      </div>
    )
  }

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        gl={{ antialias: !isMobile }}
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 2)}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Logo3DHeroScene color={color} isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}
