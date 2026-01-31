'use client'

import { cn } from '@/lib/utils'

interface ErrorAnimationProps {
  size?: number
  className?: string
  animate?: boolean
  variant?: 'default' | 'red'
}

export function ErrorAnimation({
  size = 48,
  className,
  animate = true,
  variant = 'default',
}: ErrorAnimationProps) {
  const colorClass = variant === 'red' ? 'text-destructive' : 'text-foreground'

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        colorClass,
        animate && 'animate-shake',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background square */}
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          fill="currentColor"
          fillOpacity={0.1}
        />
        {/* X mark from two crossed rectangles */}
        {/* First diagonal (top-left to bottom-right) */}
        <rect
          x="24"
          y="10"
          width="4"
          height="28"
          fill="currentColor"
          transform="rotate(45 24 24)"
        />
        {/* Second diagonal (top-right to bottom-left) */}
        <rect
          x="24"
          y="10"
          width="4"
          height="28"
          fill="currentColor"
          transform="rotate(-45 24 24)"
        />
      </svg>
    </div>
  )
}

export function ErrorX({
  size = 24,
  className,
  animate = true,
}: Omit<ErrorAnimationProps, 'variant'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-destructive', animate && 'animate-shake', className)}
    >
      <path
        d="M6 6L18 18M6 18L18 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
      />
    </svg>
  )
}
