'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

// Toast types and context
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  dismissible?: boolean
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast helper functions
export function useToastHelpers() {
  const { addToast } = useToast()

  return {
    success: (title: string, description?: string) =>
      addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) =>
      addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) =>
      addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) =>
      addToast({ type: 'info', title, description }),
  }
}

// Provider component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast,
    }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Toast container - renders all toasts
function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-md w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

// Individual toast item
function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  const [isExiting, setIsExiting] = useState(false)

  // Auto-dismiss after duration
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.id])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      removeToast(toast.id)
    }, 200)
  }

  const Icon = iconMap[toast.type]
  const styles = styleMap[toast.type]

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 border bg-background shadow-lg',
        isExiting ? 'animate-toast-out' : 'animate-toast-in',
        styles.border
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
        )}
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border overflow-hidden">
          <div
            className={cn('h-full animate-progress-shrink', styles.progress)}
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}

      {/* Dismiss button */}
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors focus-ring"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Icon and style mappings
const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styleMap = {
  success: {
    border: 'border-l-4 border-l-success',
    icon: 'text-success',
    progress: 'bg-success',
  },
  error: {
    border: 'border-l-4 border-l-error',
    icon: 'text-error',
    progress: 'bg-error',
  },
  warning: {
    border: 'border-l-4 border-l-warning',
    icon: 'text-warning',
    progress: 'bg-warning',
  },
  info: {
    border: 'border-l-4 border-l-info',
    icon: 'text-info',
    progress: 'bg-info',
  },
}
