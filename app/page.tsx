'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { LogoAnimatedWithText } from '@/components/brand'

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  config: 'Authentication is not configured. Please contact support.',
  no_code: 'Invalid authentication response. Please try again.',
}

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  useEffect(() => {
    // Only redirect if there's no error to display
    if (!error) {
      router.replace('/dashboard')
    }
  }, [error, router])

  // If no error, show loading while redirecting
  if (!error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LogoAnimatedWithText size={32} animate={true} />
      </div>
    )
  }

  // Show error message
  const errorMessage = ERROR_MESSAGES[error] || 'An unexpected error occurred.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <LogoAnimatedWithText size={32} animate={false} />

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Sign In Error
          </h1>
          <p className="text-muted-foreground">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="/api/auth/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
          >
            Try Again
          </a>
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <LogoAnimatedWithText size={32} animate={true} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
