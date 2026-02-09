import React from "react"
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { GeistPixelSquare } from 'geist/font/pixel'
import { RootProvider } from 'fumadocs-ui/provider/next'
import '../globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://reconcile.app'),
  title: 'Reconciled Docs',
  description: 'Documentation for Reconciled - Automated accounting reconciliation platform',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export default function DocsRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} font-sans antialiased`}>
        <RootProvider
          search={{
            options: {
              api: '/api/search',
            },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
