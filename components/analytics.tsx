'use client'

import dynamic from 'next/dynamic'

// Dynamically import Analytics client-side only to avoid blocking initial render
const VercelAnalytics = dynamic(
  () => import('@vercel/analytics/react').then((mod) => mod.Analytics),
  { ssr: false }
)

export function Analytics() {
  return <VercelAnalytics />
}
