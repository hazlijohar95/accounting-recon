/**
 * Frame conversion utilities for Remotion animations.
 * All animations are frame-based (60fps).
 */

export const FPS = 60

/**
 * Convert seconds to frames at 60fps.
 */
export function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS)
}

/**
 * Convert frames to seconds.
 */
export function framesToSeconds(frames: number): number {
  return frames / FPS
}

/**
 * Scene timing definitions (in frames at 60fps).
 * Total: 30 seconds = 1800 frames
 *
 * Scene 1: Fragmentation (0-8s) - 480 frames
 * Scene 2: Intelligence (8-18s) - 600 frames
 * Scene 3: Resolution (18-26s) - 480 frames
 * Scene 4: Tagline (26-30s) - 240 frames
 */
export const SCENE_TIMING = {
  /** Scene 1: Fragmentation - 0 to 8s (480 frames) */
  fragmentation: {
    start: 0,
    end: secondsToFrames(8),
    duration: secondsToFrames(8),
  },
  /** Scene 2: Intelligence - 8s to 18s (600 frames) */
  intelligence: {
    start: secondsToFrames(8),
    end: secondsToFrames(18),
    duration: secondsToFrames(10),
  },
  /** Scene 3: Resolution - 18s to 26s (480 frames) */
  resolution: {
    start: secondsToFrames(18),
    end: secondsToFrames(26),
    duration: secondsToFrames(8),
  },
  /** Scene 4: Tagline - 26s to 30s (240 frames) */
  tagline: {
    start: secondsToFrames(26),
    end: secondsToFrames(30),
    duration: secondsToFrames(4),
  },
  // Legacy scene names (for backward compatibility)
  /** @deprecated Use fragmentation instead */
  logoAssembly: {
    start: 0,
    end: secondsToFrames(8),
    duration: secondsToFrames(8),
  },
  /** @deprecated Use intelligence instead */
  logoReveal: {
    start: secondsToFrames(8),
    end: secondsToFrames(18),
    duration: secondsToFrames(10),
  },
  /** @deprecated Use resolution instead */
  typography: {
    start: secondsToFrames(18),
    end: secondsToFrames(26),
    duration: secondsToFrames(8),
  },
  /** @deprecated Use tagline instead */
  cta: {
    start: secondsToFrames(26),
    end: secondsToFrames(30),
    duration: secondsToFrames(4),
  },
} as const

/**
 * Total video duration in frames.
 */
export const TOTAL_FRAMES = secondsToFrames(30)

/**
 * Video specifications.
 */
export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: FPS,
  durationInFrames: TOTAL_FRAMES,
} as const

/**
 * Brand colors.
 */
export const COLORS = {
  background: '#0a0a0a',
  logo: '#737373',
  text: '#fafafa',
  textSecondary: '#737373',
  accent: '#525252',
  card: '#171717',
  cardBorder: '#262626',
  matched: '#10b981',
} as const
