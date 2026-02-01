'use client'

/**
 * Application Sidebar Component.
 *
 * The main navigation sidebar for the Reconciled application. Provides:
 * - Logo with animated entrance on first load
 * - Company selector for multi-tenant switching
 * - Main navigation links (Dashboard, Upload, Reconcile, Reports)
 * - User authentication controls (sign in/out)
 * - Demo/Real mode toggle
 * - Collapsible state with smooth transitions
 *
 * @module components/app-sidebar
 */

import React from "react"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useToggleMode, useIsDemo, useClearRealData, useHasRealData, useSetShowOnboarding, useSidebarCollapsed, useToggleSidebar, useProcessingDocumentsCount } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LogoAnimated,
  LogoMark,
  IconSignIn,
  IconSignOut,
  IconUser,
  IconPanelCollapse,
  IconPanelExpand,
  IconDemo,
  IconReal,
  IconDashboard,
  IconUpload,
  IconReconcile,
  IconReports,
  IconSettings,
} from '@/components/brand'
import { IconTable } from '@/components/brand/icons'
import { CompanySelector } from '@/components/company-selector'
import { NavTooltip } from '@/components/nav-tooltip'
import { useAuth } from '@/components/auth-provider'

/** Navigation items configuration for the sidebar */
const navItems: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <IconDashboard size={16} /> },
  { href: '/upload', label: 'Upload', icon: <IconUpload size={16} /> },
  { href: '/reconcile', label: 'Reconcile', icon: <IconReconcile size={16} /> },
  { href: '/reports', label: 'Reports', icon: <IconReports size={16} /> },
  { href: '/workspace', label: 'Workspace', icon: <IconTable size={16} /> },
  { href: '/settings', label: 'Settings', icon: <IconSettings size={16} /> },
]

/**
 * Application sidebar with navigation, user controls, and mode toggle.
 *
 * Features:
 * - Animated logo on first session load
 * - Company selector (when authenticated and not in demo mode)
 * - Active link indicators with animated bar
 * - Collapsible with tooltip navigation when collapsed
 * - Demo/Real mode switching
 * - User avatar and sign out button
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <div className="flex">
 *   <AppSidebar />
 *   <main>{children}</main>
 * </div>
 * ```
 */
export function AppSidebar() {
  const pathname = usePathname()
  const isDemo = useIsDemo()
  const toggleMode = useToggleMode()
  const clearRealData = useClearRealData()
  const hasRealData = useHasRealData()
  const setShowOnboarding = useSetShowOnboarding()
  const { user, isAuthenticated, login, logout } = useAuth()
  const [isFirstLoad, setIsFirstLoad] = useState(false)
  const [showWordmark, setShowWordmark] = useState(false)

  // Sidebar collapse state
  const isCollapsed = useSidebarCollapsed()
  const toggleSidebar = useToggleSidebar()

  // Processing count for badge
  const processingCount = useProcessingDocumentsCount()

  useEffect(() => {
    // Check if this is the first load of the session
    const hasAnimated = sessionStorage.getItem('logo-animated')
    if (!hasAnimated) {
      setIsFirstLoad(true)
      sessionStorage.setItem('logo-animated', 'true')
      // Show wordmark after logo animation completes
      const timer = setTimeout(() => setShowWordmark(true), 500)
      return () => clearTimeout(timer)
    } else {
      setShowWordmark(true)
    }
  }, [])

  return (
    <aside
      className={cn(
        'border-r border-border bg-background flex flex-col sidebar-transition',
        isCollapsed ? 'w-16 sidebar-collapsed' : 'w-[180px] sidebar-expanded'
      )}
    >
      {/* Header with logo */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="shrink-0">
            {isFirstLoad && !isCollapsed ? (
              <LogoAnimated size={24} animate={true} />
            ) : (
              <LogoMark size={24} className="text-foreground" />
            )}
          </span>
          <span
            className={cn(
              'text-sm font-medium tracking-tight sidebar-label',
              showWordmark ? 'opacity-100' : 'opacity-0'
            )}
          >
            reconcile
          </span>
        </div>
      </div>

      {/* Company selector (only when authenticated, not in demo mode, and expanded) */}
      {isAuthenticated && !isDemo && !isCollapsed && (
        <div className="px-3 py-2 border-b border-border">
          <CompanySelector onCreateNew={() => setShowOnboarding(true)} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const showBadge = item.href === '/upload' && processingCount > 0
            return (
              <li key={item.href}>
                <NavTooltip label={showBadge ? `${item.label} (${processingCount} processing)` : item.label} show={isCollapsed}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors relative',
                      isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-foreground animate-wipe-vertical origin-center" />
                    )}
                    <span className="shrink-0 relative">
                      {item.icon}
                      {/* Processing badge */}
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      )}
                    </span>
                    <span className="sidebar-label flex-1">{item.label}</span>
                    {/* Processing count badge */}
                    {showBadge && !isCollapsed && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-500 font-medium tabular-nums">
                        {processingCount}
                      </span>
                    )}
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </NavTooltip>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border">
        {/* User section */}
        <div className="p-2">
          {isAuthenticated && user ? (
            // Authenticated user
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-4 h-4 rounded-sm object-cover"
                  />
                ) : (
                  <IconUser size={16} className="text-muted-foreground" />
                )}
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground sidebar-label">
                {user.name || user.email}
              </span>
              <NavTooltip label="Sign out" show={!isCollapsed}>
                <button
                  onClick={logout}
                  className="shrink-0 p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors sidebar-label"
                  title="Sign out"
                >
                  <IconSignOut size={14} />
                </button>
              </NavTooltip>
            </div>
          ) : !isDemo ? (
            // Sign in - direct link bypasses any JS event issues
            <a
              href="/api/auth/login"
              className="w-full flex items-center gap-3 px-3 py-2 text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
              title="Sign in"
            >
              <IconSignIn size={16} className="shrink-0" />
              <span className="text-xs font-medium sidebar-label">Sign in</span>
            </a>
          ) : null}
        </div>

        {/* Mode toggle - only show for unauthenticated users */}
        {!isAuthenticated && (
          <div className="px-2 pb-2">
            <NavTooltip label={isDemo ? 'Switch to Real' : 'Switch to Demo'} show={isCollapsed}>
              <button
                type="button"
                onClick={() => toggleMode()}
                className="w-full group"
                title={isDemo ? 'Switch to Real Mode' : 'Switch to Demo Mode'}
              >
                <div className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors">
                  {/* Animated mode icon */}
                  <span className="shrink-0 relative w-4 h-4">
                    <span
                      className={cn(
                        "absolute inset-0 transition-all duration-300 ease-in-out text-muted-foreground group-hover:text-foreground",
                        isDemo ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      )}
                    >
                      <IconDemo size={16} />
                    </span>
                    <span
                      className={cn(
                        "absolute inset-0 transition-all duration-300 ease-in-out text-muted-foreground group-hover:text-foreground",
                        !isDemo ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      )}
                    >
                      <IconReal size={16} />
                    </span>
                  </span>

                  {/* Mode label */}
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors sidebar-label">
                    {isDemo ? 'Demo' : 'Real'}
                  </span>
                </div>
              </button>
            </NavTooltip>

            {/* Clear data - subtle text button */}
            {!isDemo && hasRealData && !isCollapsed && (
              <button
                onClick={clearRealData}
                className="w-full px-3 py-1 text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors text-left sidebar-label"
              >
                Clear data
              </button>
            )}
          </div>
        )}

        {/* Collapse toggle - minimal bottom bar */}
        <div className="border-t border-border/50">
          <NavTooltip label={isCollapsed ? 'Expand' : 'Collapse'} show={isCollapsed}>
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center py-2 text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <IconPanelExpand size={14} />
              ) : (
                <IconPanelCollapse size={14} />
              )}
            </button>
          </NavTooltip>
        </div>
      </div>
    </aside>
  )
}
