import React from 'react'
import { useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS } from '../../utils/timing'

interface MatchingPipelineProps {
  /** Frame when pipeline animation starts */
  startFrame: number
  /** Which stage is currently active (0-4, or -1 for none) */
  activeStage?: number
  /** Overall opacity */
  opacity?: number
  /** Scale factor */
  scale?: number
}

const STAGES = [
  { label: 'Exact', color: '#10b981' },
  { label: 'Window', color: '#3b82f6' },
  { label: 'Reference', color: '#8b5cf6' },
  { label: 'Fuzzy', color: '#f59e0b' },
  { label: 'LLM', color: '#ec4899' },
]

/**
 * Simplified 5-layer matching pipeline visualization.
 * Shows the progression: Exact → Window → Reference → Fuzzy → LLM Semantic
 */
export function MatchingPipeline({
  startFrame,
  activeStage = -1,
  opacity = 1,
  scale = 1,
}: MatchingPipelineProps) {
  const frame = useCurrentFrame()
  const relativeFrame = frame - startFrame

  // Don't render before start
  if (relativeFrame < 0) return null

  // Fade in animation
  const fadeProgress = interpolate(
    relativeFrame,
    [0, 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Individual stage reveal (staggered)
  const getStageProgress = (index: number) => {
    const stageStart = index * 8
    return interpolate(
      relativeFrame,
      [stageStart, stageStart + 20],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
  }

  // Data flow animation (loops through stages)
  const flowCycle = 60 // frames per cycle
  const flowPosition = (relativeFrame % flowCycle) / flowCycle
  const activeFlowStage = Math.floor(flowPosition * STAGES.length)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8 * scale,
        opacity: opacity * fadeProgress,
        transform: `scale(${scale})`,
        padding: '16px 24px',
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        borderRadius: 12,
        border: `1px solid ${COLORS.cardBorder}`,
      }}
    >
      {STAGES.map((stage, index) => {
        const stageProgress = getStageProgress(index)
        const isActive = activeStage === index || (activeStage === -1 && activeFlowStage === index)
        const isCompleted = activeStage > index

        // Pulse effect for active stage
        const pulseScale = isActive
          ? 1 + Math.sin(relativeFrame * 0.15) * 0.05
          : 1

        return (
          <React.Fragment key={stage.label}>
            {/* Stage node */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                opacity: stageProgress,
                transform: `scale(${stageProgress * pulseScale})`,
              }}
            >
              {/* Circle indicator */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: isActive || isCompleted
                    ? stage.color
                    : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${stage.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s',
                  boxShadow: isActive
                    ? `0 0 20px ${stage.color}40`
                    : 'none',
                }}
              >
                {isCompleted && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {isActive && !isCompleted && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'white',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive || isCompleted ? COLORS.text : COLORS.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector arrow (except after last) */}
            {index < STAGES.length - 1 && (
              <div
                style={{
                  width: 24,
                  height: 2,
                  backgroundColor: index < activeFlowStage || isCompleted
                    ? COLORS.matched
                    : COLORS.cardBorder,
                  opacity: stageProgress,
                  position: 'relative',
                }}
              >
                {/* Animated pulse on connector */}
                {index === activeFlowStage - 1 && activeStage === -1 && (
                  <div
                    style={{
                      position: 'absolute',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: COLORS.matched,
                      top: -2,
                      left: `${(flowPosition * STAGES.length - index - 1) * 100}%`,
                      boxShadow: `0 0 8px ${COLORS.matched}`,
                    }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
