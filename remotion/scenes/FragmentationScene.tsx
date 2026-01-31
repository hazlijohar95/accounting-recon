import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { GridBackground } from '../components/backgrounds/GridBackground'
import { BankTransactionCard } from '../components/data/BankTransactionCard'
import { InvoiceCard } from '../components/data/InvoiceCard'
import { ReceiptCard } from '../components/data/ReceiptCard'
import { COLORS } from '../utils/timing'

/**
 * Scene 1: Fragmentation (0-8s, frames 0-480)
 *
 * Floating disconnected data cards drift independently.
 * Bank rows, invoice snippets, receipt fragments - all misaligned.
 * Creates sense of disconnection before the system brings order.
 */
export function FragmentationScene() {
  const frame = useCurrentFrame()

  // Camera lateral drift (slow left to right)
  const cameraDrift = interpolate(
    frame,
    [0, 480],
    [-2, 2],
    { extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Subtle grid background */}
      <GridBackground gridOpacity={0.03} noiseOpacity={0.02} />

      {/* Container with camera drift */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateX(${cameraDrift}%)`,
        }}
      >
        {/* Bank Transaction Cards */}
        <BankTransactionCard
          id="bank1"
          initialPosition={[18, 25]}
          initialRotation={-3}
          depth={0.7}
          fadeInFrame={0}
          fadeInDuration={45}
          width={300}
          date="Jan 15, 2024"
          description="ACME Corp Payment"
          amount={12500}
          reference="REF-4521"
        />

        <BankTransactionCard
          id="bank2"
          initialPosition={[75, 65]}
          initialRotation={4}
          depth={0.4}
          fadeInFrame={30}
          fadeInDuration={45}
          width={280}
          date="Jan 18, 2024"
          description="Cloud Services Inc"
          amount={-4500}
        />

        {/* Invoice Cards */}
        <InvoiceCard
          id="inv1"
          initialPosition={[55, 30]}
          initialRotation={5}
          depth={0.6}
          fadeInFrame={60}
          fadeInDuration={45}
          width={290}
          invoiceNumber="INV-2024-0891"
          vendor="ACME Corporation"
          date="Jan 14, 2024"
          total={12500}
          status="pending"
        />

        <InvoiceCard
          id="inv2"
          initialPosition={[25, 70]}
          initialRotation={-6}
          depth={0.3}
          fadeInFrame={90}
          fadeInDuration={45}
          width={280}
          invoiceNumber="INV-2024-0923"
          vendor="Cloud Services Inc"
          date="Jan 17, 2024"
          total={4500}
          status="pending"
        />

        {/* Receipt Cards */}
        <ReceiptCard
          id="rec1"
          initialPosition={[82, 28]}
          initialRotation={-4}
          depth={0.8}
          fadeInFrame={120}
          fadeInDuration={45}
          width={260}
          receiptId="8847291"
          merchant="Office Supplies Co"
          date="Jan 16, 2024"
          amount={847.50}
          category="Supplies"
        />

        <ReceiptCard
          id="rec2"
          initialPosition={[45, 75]}
          initialRotation={3}
          depth={0.5}
          fadeInFrame={150}
          fadeInDuration={45}
          width={250}
          receiptId="8892103"
          merchant="Tech Hardware Ltd"
          date="Jan 19, 2024"
          amount={2150}
          category="Equipment"
        />

        {/* Additional cards for depth */}
        <BankTransactionCard
          id="bank3"
          initialPosition={[12, 50]}
          initialRotation={-2}
          depth={0.2}
          fadeInFrame={180}
          fadeInDuration={45}
          width={260}
          date="Jan 20, 2024"
          description="Marketing Agency"
          amount={-8750}
        />

        <InvoiceCard
          id="inv3"
          initialPosition={[88, 48]}
          initialRotation={2}
          depth={0.35}
          fadeInFrame={210}
          fadeInDuration={45}
          width={270}
          invoiceNumber="INV-2024-0945"
          vendor="Marketing Agency"
          date="Jan 19, 2024"
          total={8750}
          status="pending"
        />
      </div>

      {/* Subtle vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, ${COLORS.background} 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
