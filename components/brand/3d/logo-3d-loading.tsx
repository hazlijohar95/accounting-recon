'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { LogoAnimated } from '../logo-animated'
import { LOGO_RECTANGLES, EXTRUSION_DEPTH, type LogoRectangle } from './utils/geometry'
import { easeOutBack, easeOutCubic, lerp, spring } from './utils/easing'
import { LogoLighting } from './logo-3d-base'

interface LoadingRectangleProps {
  rect: LogoRectangle
  index: number
  color: THREE.Color
  phase: 'flyIn' | 'settle' | 'hold' | 'pulse'
  phaseProgress: number
}

function LoadingRectangle({
  rect,
  index,
  color,
  phase,
  phaseProgress,
}: LoadingRectangleProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  // Random starting position for fly-in
  const startPosition = useMemo(() => ({
    x: (Math.random() - 0.5) * 4,
    y: (Math.random() - 0.5) * 4,
    z: (Math.random() - 0.5) * 2 + 2,
  }), [])

  // Target position
  const targetPosition: [number, number, number] = useMemo(() => [
    rect.x + rect.width / 2,
    -(rect.y + rect.height / 2),
    rect.z,
  ], [rect])

  // Velocity state for spring physics
  const velocity = useRef({ x: 0, y: 0, z: 0 })

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return

    const mesh = meshRef.current
    const material = materialRef.current
    const delay = index * 0.1

    switch (phase) {
      case 'flyIn': {
        // Calculate delayed progress
        const localProgress = Math.max(0, Math.min(1, (phaseProgress - delay) / 0.6))
        const eased = easeOutCubic(localProgress)

        mesh.position.x = lerp(startPosition.x, targetPosition[0], eased)
        mesh.position.y = lerp(startPosition.y, targetPosition[1], eased)
        mesh.position.z = lerp(startPosition.z, targetPosition[2], eased)
        mesh.scale.setScalar(lerp(0.5, 1, eased))
        mesh.rotation.x = lerp(Math.random() * Math.PI, 0, eased)
        mesh.rotation.y = lerp(Math.random() * Math.PI, 0, eased)
        break
      }

      case 'settle': {
        // Spring physics for settling
        const springResult = spring(
          mesh.position.z,
          targetPosition[2],
          velocity.current.z,
          150,
          12
        )
        mesh.position.z = springResult.value
        velocity.current.z = springResult.velocity

        // Ease out any remaining rotation
        mesh.rotation.x *= 0.9
        mesh.rotation.y *= 0.9
        break
      }

      case 'hold': {
        // Hold position
        mesh.position.set(...targetPosition)
        mesh.rotation.set(0, 0, 0)
        mesh.scale.setScalar(1)
        break
      }

      case 'pulse': {
        // Subtle pulse effect
        const pulseScale = 1 + Math.sin(phaseProgress * Math.PI * 2) * 0.05
        mesh.scale.setScalar(pulseScale)

        // Glow effect via emissive
        const glowIntensity = Math.sin(phaseProgress * Math.PI) * 0.3
        material.emissive = color.clone().multiplyScalar(glowIntensity)
        break
      }
    }
  })

  return (
    <mesh ref={meshRef} position={[startPosition.x, startPosition.y, startPosition.z]}>
      <boxGeometry args={[rect.width, rect.height, EXTRUSION_DEPTH]} />
      <meshStandardMaterial ref={materialRef} color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  )
}

interface Logo3DLoadingSceneProps {
  color: string
}

function Logo3DLoadingScene({ color }: Logo3DLoadingSceneProps) {
  const [phase, setPhase] = useState<'flyIn' | 'settle' | 'hold' | 'pulse'>('flyIn')
  const [phaseProgress, setPhaseProgress] = useState(0)
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  // Animation timing (2.5s loop)
  useEffect(() => {
    const PHASES = {
      flyIn: { duration: 800, next: 'settle' as const },
      settle: { duration: 700, next: 'hold' as const },
      hold: { duration: 500, next: 'pulse' as const },
      pulse: { duration: 500, next: 'flyIn' as const },
    }

    let startTime = Date.now()
    let currentPhase = phase

    const animate = () => {
      const elapsed = Date.now() - startTime
      const phaseDuration = PHASES[currentPhase].duration
      const progress = Math.min(elapsed / phaseDuration, 1)

      setPhaseProgress(progress)

      if (progress >= 1) {
        currentPhase = PHASES[currentPhase].next
        setPhase(currentPhase)
        startTime = Date.now()
      }

      requestAnimationFrame(animate)
    }

    const animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [])

  return (
    <>
      <LogoLighting />
      <group>
        {LOGO_RECTANGLES.map((rect, index) => (
          <LoadingRectangle
            key={rect.id}
            rect={rect}
            index={index}
            color={threeColor}
            phase={phase}
            phaseProgress={phaseProgress}
          />
        ))}
      </group>
    </>
  )
}

export interface Logo3DLoadingProps {
  /** Size of the canvas */
  size?: number
  /** Color of the logo */
  color?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Loading variant of the 3D logo with assembly animation.
 * Features fly-in, spring settle, hold, and pulse phases in a 2.5s loop.
 */
export function Logo3DLoading({
  size = 200,
  color = '#737373',
  className,
}: Logo3DLoadingProps) {
  const prefersReducedMotion = useReducedMotion()

  // Fallback to 2D animated logo
  if (prefersReducedMotion) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ width: size, height: size }}>
        <LogoAnimated size={size * 0.6} />
      </div>
    )
  }

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        gl={{ antialias: false }}
        dpr={1}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Logo3DLoadingScene color={color} />
        </Suspense>
      </Canvas>
    </div>
  )
}
