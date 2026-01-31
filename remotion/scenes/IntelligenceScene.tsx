import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion'
import { GridBackground } from '../components/backgrounds/GridBackground'
import { BankTransactionCard } from '../components/data/BankTransactionCard'
import { InvoiceCard } from '../components/data/InvoiceCard'
import { ConnectionLine } from '../components/matching/ConnectionLine'
import { MatchingPipeline } from '../components/matching/MatchingPipeline'
import { ConfidenceGauge } from '../components/matching/ConfidenceGauge'
import { COLORS, secondsToFrames } from '../utils/timing'

/**
 * Scene 2: Intelligence (8-18s, frames 480-1080)
 *
 * System "thinking" - cards snap into alignment, connection lines
 * appear between matched fields, pipeline activates, confidence fills.
 */
export function IntelligenceScene() {
  const frame = useCurrentFrame()

  // Scene-relative frame (starts at 0 for this scene)
  // Note: When used in Sequence, frame resets to 0

  // Phase 1: Cards align (0-180 frames / 0-3s)
  const alignmentProgress = interpolate(
    frame,
    [0, 180],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  )

  // Phase 2: Connection lines draw (120-300 frames / 2-5s)
  const connectionStart = 120

  // Phase 3: Pipeline appears (180-420 frames / 3-7s)
  const pipelineStart = 180
  const pipelineOpacity = interpolate(
    frame,
    [pipelineStart, pipelineStart + 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Phase 4: Confidence gauge fills (240-420 frames / 4-7s)
  const gaugeStart = 240

  // Camera: slow push-in toward center
  const cameraZoom = interpolate(
    frame,
    [0, 600],
    [1, 1.1],
    { extrapolateRight: 'clamp' }
  )

  // Cards become "matched" after alignment
  const showMatched = alignmentProgress > 0.9

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Grid background */}
      <GridBackground gridOpacity={0.03} noiseOpacity={0.02} />

      {/* Main content with camera zoom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Aligned card pair 1: Bank ↔ Invoice */}
        <BankTransactionCard
          id="bank-aligned-1"
          initialPosition={[25, 35]}
          targetPosition={[30, 40]}
          alignmentProgress={alignmentProgress}
          initialRotation={-3}
          depth={0.7}
          fadeInFrame={0}
          fadeInDuration={0}
          width={300}
          date="Jan 15, 2024"
          description="ACME Corp Payment"
          amount={12500}
          reference="REF-4521"
          matched={showMatched}
        />

        <InvoiceCard
          id="inv-aligned-1"
          initialPosition={[65, 30]}
          targetPosition={[60, 40]}
          alignmentProgress={alignmentProgress}
          initialRotation={5}
          depth={0.6}
          fadeInFrame={0}
          fadeInDuration={0}
          width={290}
          invoiceNumber="INV-2024-0891"
          vendor="ACME Corporation"
          date="Jan 14, 2024"
          total={12500}
          status={showMatched ? 'paid' : 'pending'}
          matched={showMatched}
        />

        {/* Connection line between pair 1 */}
        <ConnectionLine
          from={[38, 40]}
          to={[52, 40]}
          startFrame={connectionStart}
          drawDuration={45}
          curveIntensity={0.2}
        />

        {/* Aligned card pair 2: Bank ↔ Invoice */}
        <BankTransactionCard
          id="bank-aligned-2"
          initialPosition={[20, 70]}
          targetPosition={[30, 65]}
          alignmentProgress={alignmentProgress}
          initialRotation={4}
          depth={0.5}
          fadeInFrame={0}
          fadeInDuration={0}
          width={280}
          date="Jan 18, 2024"
          description="Cloud Services Inc"
          amount={-4500}
          matched={showMatched}
        />

        <InvoiceCard
          id="inv-aligned-2"
          initialPosition={[75, 75]}
          targetPosition={[60, 65]}
          alignmentProgress={alignmentProgress}
          initialRotation={-6}
          depth={0.45}
          fadeInFrame={0}
          fadeInDuration={0}
          width={280}
          invoiceNumber="INV-2024-0923"
          vendor="Cloud Services Inc"
          date="Jan 17, 2024"
          total={4500}
          status={showMatched ? 'paid' : 'pending'}
          matched={showMatched}
        />

        {/* Connection line between pair 2 */}
        <ConnectionLine
          from={[38, 65]}
          to={[52, 65]}
          startFrame={connectionStart + 30}
          drawDuration={45}
          curveIntensity={0.15}
        />

        {/* Matching Pipeline - center bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: pipelineOpacity,
          }}
        >
          <MatchingPipeline
            startFrame={pipelineStart}
            scale={0.9}
          />
        </div>

        {/* Confidence Gauge - top right */}
        <div
          style={{
            position: 'absolute',
            top: '12%',
            right: '8%',
          }}
        >
          <ConfidenceGauge
            targetValue={92}
            startFrame={gaugeStart}
            fillDuration={90}
            size={140}
          />
        </div>

        {/* Additional match indicator text */}
        {alignmentProgress > 0.8 && (
          <div
            style={{
              position: 'absolute',
              top: '8%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: interpolate(
                frame,
                [180, 210],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: COLORS.matched,
                boxShadow: `0 0 12px ${COLORS.matched}`,
              }}
            />
            <span
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: COLORS.text,
                letterSpacing: '0.02em',
              }}
            >
              2 matches found
            </span>
          </div>
        )}
      </div>

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 50%, ${COLORS.background} 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
