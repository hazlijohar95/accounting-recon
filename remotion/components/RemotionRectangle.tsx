import React, { useMemo } from 'react'
import * as THREE from 'three'
import { type LogoRectangle, EXTRUSION_DEPTH } from '../../components/brand/3d/utils/geometry'

interface RemotionRectangleProps {
  rect: LogoRectangle
  color: THREE.Color | string
  /** Position offset from default (for assembly animation) */
  positionOffset?: [number, number, number]
  /** Scale multiplier */
  scale?: number
  /** Opacity for fade effects */
  opacity?: number
  /** Rotation in radians [x, y, z] */
  rotation?: [number, number, number]
}

/**
 * Individual rectangle mesh for Remotion.
 * All animation is controlled externally via props (no useFrame).
 */
export function RemotionRectangle({
  rect,
  color,
  positionOffset = [0, 0, 0],
  scale = 1,
  opacity = 1,
  rotation = [0, 0, 0],
}: RemotionRectangleProps) {
  // Calculate center position for the rectangle
  const position: [number, number, number] = useMemo(() => [
    rect.x + rect.width / 2 + positionOffset[0],
    -(rect.y + rect.height / 2) + positionOffset[1],
    rect.z + positionOffset[2],
  ], [rect, positionOffset])

  const threeColor = useMemo(
    () => (color instanceof THREE.Color ? color : new THREE.Color(color)),
    [color]
  )

  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      <boxGeometry args={[rect.width, rect.height, EXTRUSION_DEPTH]} />
      <meshStandardMaterial
        color={threeColor}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  )
}
