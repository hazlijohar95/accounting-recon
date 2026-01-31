'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { LogoMark } from '../logo-mark'
import { LOGO_RECTANGLES, EXTRUSION_DEPTH, type LogoRectangle } from './utils/geometry'
import { easeOutCubic, lerp } from './utils/easing'
import { LogoLighting } from './logo-3d-base'

interface ShowcaseRectangleProps {
  rect: LogoRectangle
  index: number
  color: THREE.Color
  exploded: boolean
  explodeProgress: number
}

function ShowcaseRectangle({
  rect,
  index,
  color,
  exploded,
  explodeProgress,
}: ShowcaseRectangleProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const assembledPosition: [number, number, number] = useMemo(() => [
    rect.x + rect.width / 2,
    -(rect.y + rect.height / 2),
    rect.z,
  ], [rect])

  // Exploded position (spread out in 3D space)
  const explodedPosition: [number, number, number] = useMemo(() => [
    assembledPosition[0] * 1.5,
    assembledPosition[1] * 1.5,
    assembledPosition[2] + 0.3 + index * 0.15,
  ], [assembledPosition, index])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    const clampedDelta = Math.min(delta, 0.1)
    const eased = easeOutCubic(explodeProgress)

    // Interpolate position
    const targetPos = exploded ? explodedPosition : assembledPosition
    const currentPos = exploded ? assembledPosition : explodedPosition

    meshRef.current.position.x = lerp(currentPos[0], targetPos[0], eased)
    meshRef.current.position.y = lerp(currentPos[1], targetPos[1], eased)
    meshRef.current.position.z = lerp(currentPos[2], targetPos[2], eased)

    // Subtle rotation when exploded
    if (exploded && explodeProgress > 0.5) {
      const rotSpeed = 0.2
      meshRef.current.rotation.x += clampedDelta * rotSpeed * (index % 2 === 0 ? 1 : -1)
      meshRef.current.rotation.y += clampedDelta * rotSpeed * 0.5
    } else {
      // Ease back to no rotation
      meshRef.current.rotation.x = lerp(meshRef.current.rotation.x, 0, clampedDelta * 4)
      meshRef.current.rotation.y = lerp(meshRef.current.rotation.y, 0, clampedDelta * 4)
    }
  })

  return (
    <mesh ref={meshRef} position={assembledPosition}>
      <boxGeometry args={[rect.width, rect.height, EXTRUSION_DEPTH]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  )
}

interface Logo3DShowcaseSceneProps {
  color: string
  autoRotate: boolean
  exploded: boolean
}

function Logo3DShowcaseScene({
  color,
  autoRotate,
  exploded,
}: Logo3DShowcaseSceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [explodeProgress, setExplodeProgress] = useState(0)
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  // Animate explode/assemble transition
  useEffect(() => {
    const startTime = Date.now()
    const duration = 600

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setExplodeProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    setExplodeProgress(0)
    animate()
  }, [exploded])

  return (
    <>
      <LogoLighting />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={5}
        autoRotate={autoRotate}
        autoRotateSpeed={1}
      />
      <group ref={groupRef}>
        {LOGO_RECTANGLES.map((rect, index) => (
          <ShowcaseRectangle
            key={rect.id}
            rect={rect}
            index={index}
            color={threeColor}
            exploded={exploded}
            explodeProgress={explodeProgress}
          />
        ))}
      </group>
    </>
  )
}

export interface Logo3DShowcaseProps {
  /** Width of the canvas */
  width?: number | string
  /** Height of the canvas */
  height?: number | string
  /** Color of the logo */
  color?: string
  /** Show controls UI */
  showControls?: boolean
  /** Initial auto-rotate state */
  initialAutoRotate?: boolean
  /** Initial exploded state */
  initialExploded?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Interactive showcase variant of the 3D logo.
 * Features OrbitControls, auto-rotate toggle, and explode/assemble toggle.
 */
export function Logo3DShowcase({
  width = '100%',
  height = 400,
  color = '#737373',
  showControls = true,
  initialAutoRotate = true,
  initialExploded = false,
  className,
}: Logo3DShowcaseProps) {
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate)
  const [exploded, setExploded] = useState(initialExploded)
  const [currentColor, setCurrentColor] = useState(color)
  const prefersReducedMotion = useReducedMotion()

  // Sync color prop
  useEffect(() => {
    setCurrentColor(color)
  }, [color])

  // Fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className={cn('flex flex-col items-center gap-4', className)}
        style={{ width, height }}
      >
        <LogoMark size={typeof height === 'number' ? height * 0.5 : 200} />
        <p className="text-muted-foreground text-xs">3D view disabled (reduced motion)</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="relative" style={{ width, height }}>
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 50 }}
          gl={{ antialias: true }}
          dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <Logo3DShowcaseScene
              color={currentColor}
              autoRotate={autoRotate}
              exploded={exploded}
            />
          </Suspense>
        </Canvas>
      </div>

      {showControls && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={cn(
              'px-3 py-1.5 text-xs font-mono border transition-colors',
              autoRotate
                ? 'border-foreground bg-foreground text-background'
                : 'border-muted-foreground/30 hover:border-foreground'
            )}
          >
            {autoRotate ? 'Stop' : 'Rotate'}
          </button>
          <button
            onClick={() => setExploded(!exploded)}
            className={cn(
              'px-3 py-1.5 text-xs font-mono border transition-colors',
              exploded
                ? 'border-foreground bg-foreground text-background'
                : 'border-muted-foreground/30 hover:border-foreground'
            )}
          >
            {exploded ? 'Assemble' : 'Explode'}
          </button>
        </div>
      )}
    </div>
  )
}
