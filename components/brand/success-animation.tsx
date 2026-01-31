'use client'

import { cn } from '@/lib/utils'

interface SuccessAnimationProps {
  size?: number
  className?: string
  animate?: boolean
  variant?: 'default' | 'green'
}

export function SuccessAnimation({
  size = 48,
  className,
  animate = true,
  variant = 'default',
}: SuccessAnimationProps) {
  const colorClass = variant === 'green' ? 'text-emerald-500' : 'text-foreground'

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        colorClass,
        animate && 'animate-scale-in',
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
        {/* Background square (optional) */}
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          fill="currentColor"
          fillOpacity={0.1}
          className={animate ? 'animate-fade-in' : ''}
        />
        {/* Checkmark built from two rectangles */}
        {/* Short arm of check */}
        <rect
          x="10"
          y="22"
          width="12"
          height="4"
          fill="currentColor"
          transform="rotate(-45 10 22)"
          className={animate ? 'animate-rectangle-reveal origin-left' : ''}
          style={animate ? { animationDelay: '150ms' } : {}}
        />
        {/* Long arm of check */}
        <rect
          x="16"
          y="28"
          width="24"
          height="4"
          fill="currentColor"
          transform="rotate(-45 16 28)"
          className={animate ? 'animate-rectangle-reveal origin-left' : ''}
          style={animate ? { animationDelay: '300ms' } : {}}
        />
      </svg>
    </div>
  )
}

export function SuccessCheckmark({
  size = 24,
  className,
  animate = true,
}: Omit<SuccessAnimationProps, 'variant'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-foreground', className)}
    >
      <path
        d="M5 12L10 17L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={animate ? 'animate-check-draw' : ''}
        style={{
          strokeDasharray: 24,
          strokeDashoffset: animate ? 0 : 24,
        }}
      />
    </svg>
  )
}
