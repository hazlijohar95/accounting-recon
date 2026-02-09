'use client'

import React, { useState, useEffect } from 'react'
import { VIDEO_CONFIG, TOTAL_FRAMES } from '../../../../remotion/utils/timing'
import { IconPlay, IconPause, IconRefresh, IconFilmStrip } from '@/components/brand/icons'
import { CommandBlock } from './command-block'

/**
 * Video section for the design page.
 * Displays the Remotion launch video with playback controls.
 */
export function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false)

  // Defer Remotion Player to client-only to avoid hydration mismatches.
  // Remotion computes frame-based style values (position, rotation, opacity)
  // that differ in precision between server and client renders.
  const [RemotionPlayer, setRemotionPlayer] = useState<{
    Player: typeof import('@remotion/player').Player
    LaunchVideo: typeof import('../../../../remotion/LaunchVideo').LaunchVideo
  } | null>(null)

  useEffect(() => {
    Promise.all([
      import('@remotion/player'),
      import('../../../../remotion/LaunchVideo'),
    ]).then(([playerMod, videoMod]) => {
      setRemotionPlayer({
        Player: playerMod.Player,
        LaunchVideo: videoMod.LaunchVideo,
      })
    })
  }, [])

  return (
    <section id="launch-video" className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <IconFilmStrip size={20} className="text-muted-foreground" />
          <h2 className="text-xl font-medium">Launch Video</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          30-second brand video showcasing the 3D logo assembly animation.
          Built with Remotion for frame-perfect control.
        </p>
      </div>

      {/* Video Player */}
      <div className="space-y-4">
        <div className="border border-border bg-[#0a0a0a] overflow-hidden">
          <div className="aspect-video relative">
            {RemotionPlayer ? (
              <RemotionPlayer.Player
                component={RemotionPlayer.LaunchVideo}
                durationInFrames={TOTAL_FRAMES}
                fps={VIDEO_CONFIG.fps}
                compositionWidth={VIDEO_CONFIG.width}
                compositionHeight={VIDEO_CONFIG.height}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls={false}
                loop
                autoPlay={false}
                clickToPlay
                acknowledgeRemotionLicense
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                  <span className="text-sm text-muted-foreground">Loading video player...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const player = document.querySelector('video')
              if (player) {
                if (isPlaying) {
                  player.pause()
                } else {
                  player.play()
                }
                setIsPlaying(!isPlaying)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            {isPlaying ? (
              <>
                <IconPause size={16} />
                Pause
              </>
            ) : (
              <>
                <IconPlay size={16} />
                Play
              </>
            )}
          </button>

          <button
            onClick={() => {
              const player = document.querySelector('video')
              if (player) {
                player.currentTime = 0
                setIsPlaying(false)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border text-sm hover:bg-secondary transition-colors"
          >
            <IconRefresh size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Video Specifications */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SpecCard label="Resolution" value="1920x1080" />
        <SpecCard label="Frame Rate" value="60 fps" />
        <SpecCard label="Duration" value="30 seconds" />
        <SpecCard label="Total Frames" value="1,800" />
      </div>

      {/* Scenes Breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Scene Breakdown
        </h3>
        <div className="grid gap-3">
          <SceneCard
            number={1}
            name="Logo Assembly"
            timing="0:00 - 0:07"
            description="Rectangles fly in from chaos and assemble into the 'R' logo"
          />
          <SceneCard
            number={2}
            name="Logo Reveal"
            timing="0:07 - 0:13"
            description="Camera slowly orbits the assembled logo"
          />
          <SceneCard
            number={3}
            name="Typography"
            timing="0:13 - 0:22"
            description="Product name with typewriter effect + tagline"
          />
          <SceneCard
            number={4}
            name="Call to Action"
            timing="0:22 - 0:30"
            description="Logo pulse effect with URL and fade out"
          />
        </div>
      </div>

      {/* Export Commands */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Render Commands
        </h3>
        <div className="space-y-2">
          <CommandBlock
            label="Preview in Remotion Studio"
            command="pnpm remotion:preview"
          />
          <CommandBlock
            label="Render MP4"
            command="pnpm remotion:render"
          />
          <CommandBlock
            label="Export Thumbnail (frame 300)"
            command="pnpm remotion:still"
          />
        </div>
      </div>
    </section>
  )
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-lg font-mono">{value}</div>
    </div>
  )
}

function SceneCard({
  number,
  name,
  timing,
  description,
}: {
  number: number
  name: string
  timing: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 border border-border">
      <div className="w-8 h-8 flex items-center justify-center bg-secondary text-sm font-mono">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-muted-foreground font-mono">{timing}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
