'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { IconLoader } from '@/components/brand/icons'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

/**
 * Premium Button Component
 * - Primary: Dark background, subtle shadow on hover
 * - Secondary: Border only, fill on hover
 * - Danger: Red accent for destructive actions
 * - Ghost: Minimal, text-only appearance
 *
 * All variants include:
 * - Loading spinner state
 * - Icon support (left or right)
 * - Hover/active/disabled states
 * - Focus ring for accessibility
 */
export const PremiumButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    disabled,
    children,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading

    const baseClasses = cn(
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-foreground',
      'disabled:pointer-events-none disabled:opacity-50',
      'active:scale-[0.98]'
    )

    const variantClasses = {
      primary: cn(
        'bg-foreground text-background',
        'hover:bg-foreground/90 hover:shadow-md',
        'active:bg-foreground/80'
      ),
      secondary: cn(
        'border border-border bg-transparent text-foreground',
        'hover:bg-secondary hover:border-foreground/20',
        'active:bg-secondary/80'
      ),
      danger: cn(
        'border border-destructive/30 bg-transparent text-destructive',
        'hover:bg-destructive/10 hover:border-destructive/50',
        'active:bg-destructive/20'
      ),
      ghost: cn(
        'bg-transparent text-foreground',
        'hover:bg-secondary',
        'active:bg-secondary/80'
      ),
    }

    const sizeClasses = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    }

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <IconLoader className={cn(iconSizes[size], 'animate-spin')} />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className={iconSizes[size]}>{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className={iconSizes[size]}>{icon}</span>
        )}
      </button>
    )
  }
)

PremiumButton.displayName = 'PremiumButton'

// Convenience exports for common button types
export const ButtonPrimary = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <PremiumButton ref={ref} variant="primary" {...props} />
)
ButtonPrimary.displayName = 'ButtonPrimary'

export const ButtonSecondary = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <PremiumButton ref={ref} variant="secondary" {...props} />
)
ButtonSecondary.displayName = 'ButtonSecondary'

export const ButtonDanger = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <PremiumButton ref={ref} variant="danger" {...props} />
)
ButtonDanger.displayName = 'ButtonDanger'

export const ButtonGhost = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <PremiumButton ref={ref} variant="ghost" {...props} />
)
ButtonGhost.displayName = 'ButtonGhost'

/**
 * Icon-only button variant
 */
interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition'> {
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    }

    return (
      <PremiumButton
        ref={ref}
        size={size}
        className={cn(sizeClasses[size], 'px-0', className)}
        {...props}
      >
        {children}
      </PremiumButton>
    )
  }
)

IconButton.displayName = 'IconButton'
