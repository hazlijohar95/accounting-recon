'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Track hydration state to prevent flash of wrong theme
  // Using useRef + useEffect is more performant than useState for this pattern
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <NextThemesProvider {...props}>
      {/*
        Use CSS visibility instead of conditional rendering to preserve layout
        and prevent cumulative layout shift (CLS). The content is still in the DOM
        but invisible until hydration completes.
      */}
      <div style={mounted ? undefined : { visibility: 'hidden' }}>
        {children}
      </div>
    </NextThemesProvider>
  )
}
