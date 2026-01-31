import React from 'react'
import { Composition } from 'remotion'
import { LaunchVideo, LaunchVideoWithTransitions } from './LaunchVideo'
import { FragmentationScene } from './scenes/FragmentationScene'
import { IntelligenceScene } from './scenes/IntelligenceScene'
import { ResolutionScene } from './scenes/ResolutionScene'
import { TaglineScene } from './scenes/TaglineScene'
import { VIDEO_CONFIG, TOTAL_FRAMES, SCENE_TIMING } from './utils/timing'

/**
 * Remotion Root component.
 * Defines all available compositions for rendering.
 */
export function RemotionRoot() {
  return (
    <>
      {/* Main launch video - 30 seconds at 60fps */}
      <Composition
        id="LaunchVideo"
        component={LaunchVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* Alternative with crossfade transitions */}
      <Composition
        id="LaunchVideoTransitions"
        component={LaunchVideoWithTransitions}
        durationInFrames={TOTAL_FRAMES}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* Individual scene previews for development */}
      <Composition
        id="FragmentationPreview"
        component={FragmentationScene}
        durationInFrames={SCENE_TIMING.fragmentation.duration}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      <Composition
        id="IntelligencePreview"
        component={IntelligenceScene}
        durationInFrames={SCENE_TIMING.intelligence.duration}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      <Composition
        id="ResolutionPreview"
        component={ResolutionScene}
        durationInFrames={SCENE_TIMING.resolution.duration}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      <Composition
        id="TaglinePreview"
        component={TaglineScene}
        durationInFrames={SCENE_TIMING.tagline.duration}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
    </>
  )
}
