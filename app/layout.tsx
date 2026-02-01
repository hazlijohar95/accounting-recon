import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components'

import { ConvexClientProvider } from '@/components/convex-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { ToastProvider } from '@/components/ui/toast'
import { RootErrorBoundary } from '@/components/root-error-boundary'
import { Analytics } from '@/components/analytics'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Reconcile',
  description: 'Numbers that agree. Automated cash-accrual reconciliation.',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Reconcile',
    description: 'Numbers that agree. Change the way you reconcile.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reconcile',
    description: 'Numbers that agree. Change the way you reconcile.',
    images: ['/twitter-card.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <RootErrorBoundary>
          <AuthKitProvider>
            <AuthProvider>
              <ConvexClientProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  storageKey="reconcile-theme"
                >
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </ThemeProvider>
              </ConvexClientProvider>
            </AuthProvider>
          </AuthKitProvider>
        </RootErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
