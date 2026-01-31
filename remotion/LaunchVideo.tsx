import React from 'react'
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
} from 'remotion'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { FragmentationScene } from './scenes/FragmentationScene'
import { IntelligenceScene } from './scenes/IntelligenceScene'
import { ResolutionScene } from './scenes/ResolutionScene'
import { TaglineScene } from './scenes/TaglineScene'
import { SCENE_TIMING, COLORS, secondsToFrames } from './utils/timing'

/**
 * Main 30-second launch video composition.
 *
 * Narrative Arc:
 * 1. Fragmentation - Disconnected financial data floating independently
 * 2. Intelligence - System correlating and connecting the pieces
 * 3. Resolution - Clean, reconciled view with quiet confidence
 * 4. Tagline - Logo + "Change the way you reconcile."
 */
export function LaunchVideo() {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Audio track - uncomment when audio file is added */}
      {/* <Audio src={staticFile('audio/launch-music.mp3')} /> */}

      {/* Scene 1: Fragmentation (0-8s) */}
      <Sequence
        from={SCENE_TIMING.fragmentation.start}
        durationInFrames={SCENE_TIMING.fragmentation.duration}
      >
        <FragmentationScene />
      </Sequence>

      {/* Scene 2: Intelligence (8-18s) */}
      <Sequence
        from={SCENE_TIMING.intelligence.start}
        durationInFrames={SCENE_TIMING.intelligence.duration}
      >
        <IntelligenceScene />
      </Sequence>

      {/* Scene 3: Resolution (18-26s) */}
      <Sequence
        from={SCENE_TIMING.resolution.start}
        durationInFrames={SCENE_TIMING.resolution.duration}
      >
        <ResolutionScene />
      </Sequence>

      {/* Scene 4: Tagline (26-30s) */}
      <Sequence
        from={SCENE_TIMING.tagline.start}
        durationInFrames={SCENE_TIMING.tagline.duration}
      >
        <TaglineScene />
      </Sequence>
    </AbsoluteFill>
  )
}

/**
 * Alternative composition using TransitionSeries for smoother crossfade transitions.
 */
export function LaunchVideoWithTransitions() {
  const transitionDuration = secondsToFrames(0.5)

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Audio track - uncomment when audio file is added */}
      {/* <Audio src={staticFile('audio/launch-music.mp3')} /> */}

      <TransitionSeries>
        {/* Scene 1: Fragmentation */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.fragmentation.duration}>
          <FragmentationScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 2: Intelligence */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.intelligence.duration}>
          <IntelligenceScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 3: Resolution */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.resolution.duration}>
          <ResolutionScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 4: Tagline */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.tagline.duration}>
          <TaglineScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  )
}
