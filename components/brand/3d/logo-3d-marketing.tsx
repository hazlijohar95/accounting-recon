'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { LogoMark } from '../logo-mark'
import { LOGO_RECTANGLES, EXTRUSION_DEPTH, type LogoRectangle } from './utils/geometry'
import { lerp } from './utils/easing'
import { LogoLighting } from './logo-3d-base'

interface MarketingRectangleProps {
  rect: LogoRectangle
  index: number
  color: THREE.Color
  explodeFactor: number
  scrollOffset: number
  time: number
}

function MarketingRectangle({
  rect,
  index,
  color,
  explodeFactor,
  scrollOffset,
  time,
}: MarketingRectangleProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Base target position
  const basePosition: [number, number, number] = useMemo(() => [
    rect.x + rect.width / 2,
    -(rect.y + rect.height / 2),
    rect.z,
  ], [rect])

  // Unique oscillation parameters per rectangle
  const oscillation = useMemo(() => ({
    frequency: 0.5 + index * 0.15,
    amplitude: 0.03 + index * 0.01,
    phase: index * Math.PI * 0.3,
  }), [index])

  useFrame(() => {
    if (!meshRef.current) return

    // Calculate exploded position (spread out in Z)
    const explodeOffset = (0.5 + index * 0.3) * explodeFactor

    // Oscillation for floating effect
    const floatY = Math.sin(time * oscillation.frequency + oscillation.phase) * oscillation.amplitude

    // Parallax offset based on scroll
    const parallaxZ = scrollOffset * (0.1 + index * 0.05)

    // Apply position
    meshRef.current.position.set(
      basePosition[0],
      basePosition[1] + floatY,
      basePosition[2] + explodeOffset + parallaxZ
    )

    // Subtle rotation based on oscillation
    meshRef.current.rotation.x = Math.sin(time * 0.3 + oscillation.phase) * 0.02
    meshRef.current.rotation.y = Math.cos(time * 0.25 + oscillation.phase) * 0.02
  })

  return (
    <mesh ref={meshRef} position={basePosition}>
      <boxGeometry args={[rect.width, rect.height, EXTRUSION_DEPTH]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  )
}

interface Logo3DMarketingSceneProps {
  color: string
  explodeFactor: number
  scrollOffset: number
}

function Logo3DMarketingScene({
  color,
  explodeFactor,
  scrollOffset,
}: Logo3DMarketingSceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [time, setTime] = useState(0)
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  useFrame((_, delta) => {
    setTime((prev) => prev + delta)

    // Slow rotation of entire group
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <>
      <LogoLighting />
      <group ref={groupRef}>
        {LOGO_RECTANGLES.map((rect, index) => (
          <MarketingRectangle
            key={rect.id}
            rect={rect}
            index={index}
            color={threeColor}
            explodeFactor={explodeFactor}
            scrollOffset={scrollOffset}
            time={time}
          />
        ))}
      </group>
    </>
  )
}

export interface Logo3DMarketingProps {
  /** Width of the canvas */
  width?: number | string
  /** Height of the canvas */
  height?: number | string
  /** Color of the logo */
  color?: string
  /** Explode factor (0 = assembled, 1 = fully exploded) */
  explode?: number
  /** Enable scroll parallax */
  enableParallax?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Marketing variant of the 3D logo with exploded/floating view.
 * Features parallax scroll response and gentle floating oscillation.
 */
export function Logo3DMarketing({
  width = '100%',
  height = 400,
  color = '#737373',
  explode = 0.5,
  enableParallax = true,
  className,
}: Logo3DMarketingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  // Handle scroll parallax
  useEffect(() => {
    if (!enableParallax) return

    const handleScroll = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // Calculate scroll offset (-1 to 1 based on position in viewport)
      const centerY = rect.top + rect.height / 2
      const offset = (viewportHeight / 2 - centerY) / (viewportHeight / 2)
      setScrollOffset(offset)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll)
  }, [enableParallax])

  // Fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className={cn('flex items-center justify-center', className)}
        style={{ width, height }}
      >
        <LogoMark size={typeof height === 'number' ? height * 0.5 : 200} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      style={{ width, height }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        gl={{ antialias: true }}
        dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Logo3DMarketingScene
            color={color}
            explodeFactor={explode}
            scrollOffset={enableParallax ? scrollOffset : 0}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
