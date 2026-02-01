/**
 * Block font definitions for 3D text rendering.
 * Each character is defined as an array of rectangles in normalized 0-1 space.
 * Built exclusively from rectangles to match the brand aesthetic.
 */

export interface BlockRect {
  x: number
  y: number
  width: number
  height: number
}

export interface LetterDefinition {
  char: string
  width: number // Total character width for spacing
  rects: BlockRect[]
}

// Line thickness for strokes
const T = 0.2

/**
 * Block font character definitions.
 * All coordinates normalized to 0-1 height, variable width.
 */
export const BLOCK_FONT: Record<string, LetterDefinition> = {
  A: {
    char: 'A',
    width: 0.7,
    rects: [
      { x: 0, y: 0.3, width: T, height: 0.7 },      // Left leg
      { x: 0.5, y: 0.3, width: T, height: 0.7 },    // Right leg
      { x: 0, y: 0, width: 0.7, height: T },         // Top bar
      { x: 0, y: 0.5, width: 0.7, height: T },       // Middle bar
    ],
  },
  B: {
    char: 'B',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0, width: 0.5, height: T },         // Top bar
      { x: 0, y: 0.4, width: 0.5, height: T },       // Middle bar
      { x: 0, y: 0.8, width: 0.5, height: T },       // Bottom bar
      { x: 0.4, y: 0, width: T, height: 0.4 },       // Top right
      { x: 0.4, y: 0.4, width: T, height: 0.6 },     // Bottom right
    ],
  },
  C: {
    char: 'C',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0, width: 0.6, height: T },         // Top bar
      { x: 0, y: 0.8, width: 0.6, height: T },       // Bottom bar
    ],
  },
  D: {
    char: 'D',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0, width: 0.4, height: T },         // Top bar
      { x: 0, y: 0.8, width: 0.4, height: T },       // Bottom bar
      { x: 0.4, y: 0, width: T, height: 1 },         // Right stem
    ],
  },
  E: {
    char: 'E',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0, width: 0.6, height: T },         // Top bar
      { x: 0, y: 0.4, width: 0.4, height: T },       // Middle bar
      { x: 0, y: 0.8, width: 0.6, height: T },       // Bottom bar
    ],
  },
  F: {
    char: 'F',
    width: 0.5,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0, width: 0.5, height: T },         // Top bar
      { x: 0, y: 0.4, width: 0.4, height: T },       // Middle bar
    ],
  },
  G: {
    char: 'G',
    width: 0.7,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0, y: 0, width: 0.7, height: T },         // Top bar
      { x: 0, y: 0.8, width: 0.7, height: T },       // Bottom bar
      { x: 0.5, y: 0.4, width: T, height: 0.6 },     // Right stem
      { x: 0.3, y: 0.4, width: 0.4, height: T },     // Middle bar
    ],
  },
  H: {
    char: 'H',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0.4, y: 0, width: T, height: 1 },         // Right stem
      { x: 0, y: 0.4, width: 0.6, height: T },       // Middle bar
    ],
  },
  I: {
    char: 'I',
    width: 0.2,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
    ],
  },
  J: {
    char: 'J',
    width: 0.5,
    rects: [
      { x: 0.3, y: 0, width: T, height: 0.9 },       // Vertical stem
      { x: 0, y: 0.7, width: T, height: 0.3 },       // Left hook
      { x: 0, y: 0.8, width: 0.5, height: T },       // Bottom bar
    ],
  },
  K: {
    char: 'K',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0.15, y: 0.35, width: T, height: 0.3 },   // Middle connector
      { x: 0.3, y: 0, width: T, height: 0.4 },       // Top diagonal approx
      { x: 0.3, y: 0.6, width: T, height: 0.4 },     // Bottom diagonal approx
      { x: 0.45, y: 0, width: T, height: 0.25 },     // Top end
      { x: 0.45, y: 0.75, width: T, height: 0.25 },  // Bottom end
    ],
  },
  L: {
    char: 'L',
    width: 0.5,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0.8, width: 0.5, height: T },       // Bottom bar
    ],
  },
  M: {
    char: 'M',
    width: 0.8,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0.6, y: 0, width: T, height: 1 },         // Right stem
      { x: 0, y: 0, width: 0.4, height: T },         // Top left bar
      { x: 0.4, y: 0, width: 0.4, height: T },       // Top right bar
      { x: 0.3, y: 0, width: T, height: 0.4 },       // Middle peak
    ],
  },
  N: {
    char: 'N',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0.4, y: 0, width: T, height: 1 },         // Right stem
      { x: 0, y: 0, width: 0.3, height: T },         // Top bar
      { x: 0.15, y: 0.2, width: T, height: 0.3 },    // Diagonal approx top
      { x: 0.25, y: 0.45, width: T, height: 0.3 },   // Diagonal approx bottom
    ],
  },
  O: {
    char: 'O',
    width: 0.7,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0.5, y: 0, width: T, height: 1 },         // Right stem
      { x: 0, y: 0, width: 0.7, height: T },         // Top bar
      { x: 0, y: 0.8, width: 0.7, height: T },       // Bottom bar
    ],
  },
  P: {
    char: 'P',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0, width: 0.5, height: T },         // Top bar
      { x: 0, y: 0.4, width: 0.5, height: T },       // Middle bar
      { x: 0.4, y: 0, width: T, height: 0.6 },       // Right stem
    ],
  },
  Q: {
    char: 'Q',
    width: 0.7,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0.5, y: 0, width: T, height: 0.8 },       // Right stem
      { x: 0, y: 0, width: 0.7, height: T },         // Top bar
      { x: 0, y: 0.8, width: 0.7, height: T },       // Bottom bar
      { x: 0.4, y: 0.7, width: T, height: 0.3 },     // Tail
      { x: 0.5, y: 0.85, width: T, height: 0.15 },   // Tail end
    ],
  },
  R: {
    char: 'R',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Vertical stem
      { x: 0, y: 0, width: 0.5, height: T },         // Top bar
      { x: 0, y: 0.4, width: 0.5, height: T },       // Middle bar
      { x: 0.4, y: 0, width: T, height: 0.4 },       // Right top stem
      { x: 0.25, y: 0.5, width: T, height: 0.25 },   // Leg connector
      { x: 0.35, y: 0.7, width: T, height: 0.3 },    // Leg
    ],
  },
  S: {
    char: 'S',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: 0.6, height: T },         // Top bar
      { x: 0, y: 0, width: T, height: 0.5 },         // Top left stem
      { x: 0, y: 0.4, width: 0.6, height: T },       // Middle bar
      { x: 0.4, y: 0.4, width: T, height: 0.6 },     // Bottom right stem
      { x: 0, y: 0.8, width: 0.6, height: T },       // Bottom bar
    ],
  },
  T: {
    char: 'T',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: 0.6, height: T },         // Top bar
      { x: 0.2, y: 0, width: T, height: 1 },         // Vertical stem
    ],
  },
  U: {
    char: 'U',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0.4, y: 0, width: T, height: 1 },         // Right stem
      { x: 0, y: 0.8, width: 0.6, height: T },       // Bottom bar
    ],
  },
  V: {
    char: 'V',
    width: 0.7,
    rects: [
      { x: 0, y: 0, width: T, height: 0.7 },         // Left leg
      { x: 0.5, y: 0, width: T, height: 0.7 },       // Right leg
      { x: 0.1, y: 0.6, width: T, height: 0.3 },     // Left bottom
      { x: 0.4, y: 0.6, width: T, height: 0.3 },     // Right bottom
      { x: 0.2, y: 0.85, width: 0.3, height: T },    // Bottom point
    ],
  },
  W: {
    char: 'W',
    width: 0.9,
    rects: [
      { x: 0, y: 0, width: T, height: 1 },           // Left stem
      { x: 0.7, y: 0, width: T, height: 1 },         // Right stem
      { x: 0.35, y: 0.4, width: T, height: 0.6 },    // Middle stem
      { x: 0, y: 0.8, width: 0.55, height: T },      // Left bottom bar
      { x: 0.35, y: 0.8, width: 0.55, height: T },   // Right bottom bar
    ],
  },
  X: {
    char: 'X',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 0.35 },        // Top left
      { x: 0.4, y: 0, width: T, height: 0.35 },      // Top right
      { x: 0.15, y: 0.3, width: T, height: 0.4 },    // Middle left
      { x: 0.25, y: 0.3, width: T, height: 0.4 },    // Middle right
      { x: 0, y: 0.65, width: T, height: 0.35 },     // Bottom left
      { x: 0.4, y: 0.65, width: T, height: 0.35 },   // Bottom right
    ],
  },
  Y: {
    char: 'Y',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: T, height: 0.4 },         // Top left
      { x: 0.4, y: 0, width: T, height: 0.4 },       // Top right
      { x: 0.2, y: 0.3, width: T, height: 0.7 },     // Stem
      { x: 0.1, y: 0.3, width: 0.4, height: T },     // Cross bar
    ],
  },
  Z: {
    char: 'Z',
    width: 0.6,
    rects: [
      { x: 0, y: 0, width: 0.6, height: T },         // Top bar
      { x: 0.4, y: 0, width: T, height: 0.35 },      // Top right
      { x: 0.2, y: 0.3, width: T, height: 0.4 },     // Middle
      { x: 0, y: 0.65, width: T, height: 0.35 },     // Bottom left
      { x: 0, y: 0.8, width: 0.6, height: T },       // Bottom bar
    ],
  },
  ' ': {
    char: ' ',
    width: 0.3,
    rects: [],
  },
  '?': {
    char: '?',
    width: 0.5,
    rects: [
      { x: 0, y: 0, width: 0.5, height: T },         // Top bar
      { x: 0, y: 0, width: T, height: 0.2 },         // Top left
      { x: 0.3, y: 0, width: T, height: 0.45 },      // Right stem
      { x: 0.1, y: 0.35, width: 0.4, height: T },    // Middle bar
      { x: 0.1, y: 0.35, width: T, height: 0.25 },   // Connector
      { x: 0.1, y: 0.8, width: T, height: T },       // Dot
    ],
  },
}

/**
 * Calculate total width of a text string with spacing.
 */
export function calculateTextWidth(text: string, letterSpacing: number = 0.1): number {
  let totalWidth = 0
  for (const char of text.toUpperCase()) {
    const def = BLOCK_FONT[char]
    if (def) {
      totalWidth += def.width + letterSpacing
    }
  }
  return totalWidth - letterSpacing // Remove trailing space
}

/**
 * Layout text into positioned letters.
 */
export interface PositionedLetter {
  char: string
  x: number
  rects: BlockRect[]
  index: number
}

export function layoutText(
  text: string,
  letterSpacing: number = 0.1
): PositionedLetter[] {
  const result: PositionedLetter[] = []
  let currentX = 0
  let index = 0

  for (const char of text.toUpperCase()) {
    const def = BLOCK_FONT[char]
    if (def) {
      result.push({
        char,
        x: currentX,
        rects: def.rects,
        index,
      })
      currentX += def.width + letterSpacing
      index++
    }
  }

  return result
}
