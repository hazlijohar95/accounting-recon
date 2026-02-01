'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { layoutText, calculateTextWidth, type PositionedLetter, type BlockRect } from './utils/block-font'

const HERO_TEXT = 'What do you want to reconcile today?'
const LETTER_SPACING = 0.12
const LINE_HEIGHT = 1.4
const SCALE_FACTOR = 0.35
const EXTRUSION_DEPTH = 0.08
const STAGGER_DELAY = 30 // ms per letter

// Split text into lines for multi-line rendering
function splitIntoLines(text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = calculateTextWidth(testLine, LETTER_SPACING)

    if (testWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)

  return lines
}

// Easing functions
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface Letter3DProps {
  letter: PositionedLetter
  lineY: number
  color: THREE.Color
  entranceProgress: number
  globalIndex: number
  mousePosition: { x: number; y: number }
  isMobile: boolean
}

function Letter3D({
  letter,
  lineY,
  color,
  entranceProgress,
  globalIndex,
  mousePosition,
  isMobile,
}: Letter3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [currentScale, setCurrentScale] = useState(0)

  const delay = (globalIndex * STAGGER_DELAY) / 1000

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const clampedDelta = Math.min(delta, 0.1)

    // Entrance animation
    const localProgress = clamp((entranceProgress - delay) / 0.3, 0, 1)
    const easedProgress = easeOutCubic(localProgress)

    // Smooth scale transition
    const targetScale = easedProgress
    const newScale = lerp(currentScale, targetScale, clampedDelta * 10)
    setCurrentScale(newScale)
    groupRef.current.scale.setScalar(Math.max(0.001, newScale))

    // Floating animation after entrance
    if (localProgress > 0.95) {
      const floatOffset = Math.sin(Date.now() * 0.001 + globalIndex * 0.5) * 0.015
      groupRef.current.position.y = lineY + floatOffset
    }

    // Mouse tilt (desktop only)
    if (!isMobile && localProgress > 0.9) {
      const tiltX = mousePosition.y * 0.08
      const tiltY = mousePosition.x * 0.08
      groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, tiltX, clampedDelta * 3)
      groupRef.current.rotation.y = lerp(groupRef.current.rotation.y, tiltY, clampedDelta * 3)
    }
  })

  if (letter.rects.length === 0) return null

  return (
    <group ref={groupRef} position={[letter.x * SCALE_FACTOR, lineY, 0]} scale={0.001}>
      {letter.rects.map((rect, i) => (
        <mesh
          key={i}
          position={[
            (rect.x + rect.width / 2) * SCALE_FACTOR,
            -(rect.y + rect.height / 2) * SCALE_FACTOR,
            0,
          ]}
        >
          <boxGeometry
            args={[
              rect.width * SCALE_FACTOR,
              rect.height * SCALE_FACTOR,
              EXTRUSION_DEPTH,
            ]}
          />
          <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

interface Hero3DTextSceneProps {
  color: string
  isMobile: boolean
}

function Hero3DTextScene({ color, isMobile }: Hero3DTextSceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [entranceProgress, setEntranceProgress] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  // Split text into lines
  const maxLineWidth = isMobile ? 8 : 14
  const lines = useMemo(() => splitIntoLines(HERO_TEXT, maxLineWidth), [maxLineWidth])
  const layoutLines = useMemo(() => lines.map(line => layoutText(line, LETTER_SPACING)), [lines])

  // Calculate centering offsets
  const lineWidths = useMemo(() => lines.map(line => calculateTextWidth(line, LETTER_SPACING)), [lines])
  const maxWidth = Math.max(...lineWidths)

  // Global letter index for staggered animation
  let globalIndex = 0

  // Entrance animation
  useEffect(() => {
    const startTime = Date.now()
    const duration = 2000 // 2s total

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

  // Mouse tracking (desktop only)
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

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, 5]} intensity={0.3} />

      <group ref={groupRef}>
        {layoutLines.map((letters, lineIndex) => {
          const lineWidth = lineWidths[lineIndex]
          const offsetX = -(lineWidth * SCALE_FACTOR) / 2
          const lineY = -lineIndex * LINE_HEIGHT * SCALE_FACTOR + ((lines.length - 1) * LINE_HEIGHT * SCALE_FACTOR) / 2

          return letters.map(letter => {
            const currentGlobalIndex = globalIndex++
            return (
              <group key={`${lineIndex}-${letter.index}`} position={[offsetX, 0, 0]}>
                <Letter3D
                  letter={letter}
                  lineY={lineY}
                  color={threeColor}
                  entranceProgress={entranceProgress}
                  globalIndex={currentGlobalIndex}
                  mousePosition={mousePosition}
                  isMobile={isMobile}
                />
              </group>
            )
          })
        })}
      </group>
    </>
  )
}

export interface Hero3DTextProps {
  className?: string
}

/**
 * 3D geometric text hero for landing page.
 * Renders "What do you want to reconcile today?" with staggered entrance animation.
 */
export function Hero3DText({ className }: Hero3DTextProps) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  // Get theme color from CSS variable
  const [color, setColor] = useState('#737373')

  useEffect(() => {
    setMounted(true)
    const computedStyle = getComputedStyle(document.documentElement)
    const foreground = computedStyle.getPropertyValue('--foreground').trim()
    if (foreground) {
      // Convert HSL to hex if needed
      const testEl = document.createElement('div')
      testEl.style.color = `hsl(${foreground})`
      document.body.appendChild(testEl)
      const computed = getComputedStyle(testEl).color
      document.body.removeChild(testEl)
      setColor(computed)
    }
  }, [])

  // Fallback for reduced motion or SSR
  if (!mounted || prefersReducedMotion) {
    return (
      <div className={cn('flex items-center justify-center px-4', className)}>
        <h1 className="text-2xl md:text-4xl font-mono text-center text-foreground/90 tracking-tight">
          {HERO_TEXT}
        </h1>
      </div>
    )
  }

  return (
    <div className={cn('w-full h-full', className)}>
      <Canvas
        camera={{ position: [0, 0, isMobile ? 4 : 3], fov: 50 }}
        gl={{ antialias: !isMobile }}
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 2)}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Hero3DTextScene color={color} isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}

/**
 * Static fallback text for loading state.
 */
export function FallbackText() {
  return (
    <div className="flex items-center justify-center px-4">
      <h1 className="text-2xl md:text-4xl font-mono text-center text-foreground/90 tracking-tight opacity-50">
        {HERO_TEXT}
      </h1>
    </div>
  )
}
