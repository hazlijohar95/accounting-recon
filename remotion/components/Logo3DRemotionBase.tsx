import React, { useMemo } from 'react'
import { ThreeCanvas } from '@remotion/three'
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion'
import * as THREE from 'three'
import { LOGO_RECTANGLES } from '../../components/brand/3d/utils/geometry'
import { RemotionRectangle } from './RemotionRectangle'
import { RemotionLighting } from './RemotionLighting'
import { COLORS } from '../utils/timing'

interface Logo3DRemotionBaseProps {
  /** Assembly progress (0-1): 0 = scattered, 1 = assembled */
  assemblyProgress?: number
  /** Overall scale of the logo */
  scale?: number
  /** Color of the logo */
  color?: string
  /** Camera position [x, y, z] */
  cameraPosition?: [number, number, number]
  /** Camera lookAt target [x, y, z] */
  cameraTarget?: [number, number, number]
  /** Opacity for fade effects */
  opacity?: number
  /** Additional rotation in radians [x, y, z] */
  rotation?: [number, number, number]
}

/**
 * Starting positions for each rectangle (scattered state).
 * Rectangles fly in from different directions.
 */
const SCATTER_POSITIONS: Record<string, [number, number, number]> = {
  stem: [-4, 2, -3],
  topBar: [3, 4, -2],
  rightCol: [5, -1, -4],
  midBar: [-3, -3, -2],
  connector: [2, -4, -3],
  leg: [4, 3, -5],
}

/**
 * Starting rotations for each rectangle (scattered state).
 */
const SCATTER_ROTATIONS: Record<string, [number, number, number]> = {
  stem: [Math.PI * 0.3, Math.PI * 0.5, Math.PI * 0.2],
  topBar: [-Math.PI * 0.4, Math.PI * 0.3, -Math.PI * 0.1],
  rightCol: [Math.PI * 0.2, -Math.PI * 0.4, Math.PI * 0.3],
  midBar: [-Math.PI * 0.3, Math.PI * 0.2, -Math.PI * 0.4],
  connector: [Math.PI * 0.5, -Math.PI * 0.3, Math.PI * 0.2],
  leg: [-Math.PI * 0.2, Math.PI * 0.4, -Math.PI * 0.3],
}

/**
 * Frame-driven 3D logo component for Remotion.
 * All animation is derived from frame number via interpolate().
 */
export function Logo3DRemotionBase({
  assemblyProgress = 1,
  scale = 1,
  color = COLORS.logo,
  cameraPosition = [0, 0, 4],
  cameraTarget = [0, 0, 0],
  opacity = 1,
  rotation = [0, 0, 0],
}: Logo3DRemotionBaseProps) {
  const { width, height } = useVideoConfig()

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{
        fov: 50,
        position: cameraPosition,
      }}
      style={{ backgroundColor: COLORS.background }}
    >
      <RemotionLighting />
      <group scale={scale} rotation={rotation}>
        {LOGO_RECTANGLES.map((rect, index) => {
          const scatterPos = SCATTER_POSITIONS[rect.id] || [0, 0, 0]
          const scatterRot = SCATTER_ROTATIONS[rect.id] || [0, 0, 0]

          // Stagger each rectangle's animation
          const staggerOffset = index * 0.1
          const rectProgress = Math.max(0, Math.min(1,
            (assemblyProgress - staggerOffset) / (1 - staggerOffset * LOGO_RECTANGLES.length / (LOGO_RECTANGLES.length - 1))
          ))

          // Smooth easing
          const easedProgress = Easing.out(Easing.cubic)(rectProgress)

          // Interpolate from scattered to assembled position
          const positionOffset: [number, number, number] = [
            interpolate(easedProgress, [0, 1], [scatterPos[0], 0]),
            interpolate(easedProgress, [0, 1], [scatterPos[1], 0]),
            interpolate(easedProgress, [0, 1], [scatterPos[2], 0]),
          ]

          // Interpolate rotation
          const currentRotation: [number, number, number] = [
            interpolate(easedProgress, [0, 1], [scatterRot[0], 0]),
            interpolate(easedProgress, [0, 1], [scatterRot[1], 0]),
            interpolate(easedProgress, [0, 1], [scatterRot[2], 0]),
          ]

          // Scale from 0 to 1 with slight delay
          const scaleProgress = Math.max(0, Math.min(1, rectProgress * 1.5))
          const rectScale = interpolate(
            Easing.out(Easing.back(1.5))(scaleProgress),
            [0, 1],
            [0.01, 1]
          )

          return (
            <RemotionRectangle
              key={rect.id}
              rect={rect}
              color={color}
              positionOffset={positionOffset}
              rotation={currentRotation}
              scale={rectScale}
              opacity={opacity}
            />
          )
        })}
      </group>
    </ThreeCanvas>
  )
}
