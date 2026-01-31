/**
 * Logo rectangle definitions normalized to -1 to 1 coordinate space.
 * Original SVG coordinates: 48x48 viewBox with rectangles at specific positions.
 * Z-depth creates layered 3D effect.
 */
export interface LogoRectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  z: number
}

/**
 * Normalized rectangle coordinates for the geometric "R" logo.
 * Stores TOP-LEFT CORNER positions (x, y), not centers.
 * The rendering code calculates centers via getRectCenter().
 *
 * Normalization formula (from 48x48 SVG viewBox):
 * - corner_x = (svg_x - 24) / 24
 * - corner_y = (svg_y - 24) / 24
 * - width = svg_width / 24
 * - height = svg_height / 24
 *
 * Original SVG rectangles:
 * | ID        | svg_x | svg_y | svg_w | svg_h |
 * |-----------|-------|-------|-------|-------|
 * | stem      | 8     | 8     | 8     | 32    |
 * | topBar    | 16    | 8     | 16    | 8     |
 * | rightCol  | 32    | 8     | 8     | 12    |
 * | midBar    | 16    | 20    | 16    | 8     |
 * | connector | 24    | 28    | 8     | 4     |
 * | leg       | 32    | 32    | 8     | 8     |
 *
 * Z-depth creates visual layering (0.0 to 0.1 range for tighter depth).
 */
export const LOGO_RECTANGLES: LogoRectangle[] = [
  { id: 'stem',      x: -0.667,  y: -0.667,  width: 0.333, height: 1.333, z: 0.0 },
  { id: 'topBar',    x: -0.333,  y: -0.667,  width: 0.667, height: 0.333, z: 0.02 },
  { id: 'rightCol',  x: 0.333,   y: -0.667,  width: 0.333, height: 0.5,   z: 0.04 },
  { id: 'midBar',    x: -0.333,  y: -0.167,  width: 0.667, height: 0.333, z: 0.06 },
  { id: 'connector', x: 0,       y: 0.167,   width: 0.333, height: 0.167, z: 0.08 },
  { id: 'leg',       x: 0.333,   y: 0.333,   width: 0.333, height: 0.333, z: 0.1 },
]

/**
 * Converts SVG coordinate to normalized -1 to 1 range.
 */
export function normalizeCoord(value: number, viewBoxSize: number = 48): number {
  return (value / viewBoxSize) * 2 - 1
}

/**
 * Calculates center position for a rectangle given its top-left corner.
 */
export function getRectCenter(rect: LogoRectangle): [number, number, number] {
  return [
    rect.x + rect.width / 2,
    -(rect.y + rect.height / 2), // Flip Y for Three.js coordinate system
    rect.z,
  ]
}

/**
 * Stagger delays for sequential animations (in ms).
 */
export const STAGGER_DELAY = 80

/**
 * Animation timing constants (in seconds for Three.js).
 */
export const ANIMATION_DURATION = {
  entrance: 0.4,
  idle: 2.0,
  hover: 0.2,
  assemble: 0.8,
  pulse: 0.5,
}

/**
 * Default depth for 3D extrusion.
 */
export const EXTRUSION_DEPTH = 0.1
