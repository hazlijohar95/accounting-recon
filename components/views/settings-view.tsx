'use client'

/**
 * Settings View Component.
 *
 * Comprehensive settings page with sections for:
 * - Profile: Name, email display, avatar
 * - Company: Company details, currency, fiscal year
 * - Preferences: Date format, number format, theme
 * - Notifications: Email preferences
 * - Data Management: Export data, delete account
 *
 * @module components/views/settings-view
 */

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useWorkosUserId, withWorkosUserId } from '@/lib/convex-hooks/shared'
import { useSelectedCompanyId, useSetSelectedCompanyId, useIsDemo } from '@/lib/store'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { useSyncedFormState } from '@/hooks'
import {
  IconUser,
  IconBuildings,
  IconGear,
  IconBell,
  IconDatabase,
  IconDownload,
  IconTrash,
  IconSun,
  IconMoon,
  IconDesktop,
  IconCaretRight,
  IconLoader,
  IconWarning,
  IconCheck
} from '@/components/brand/icons'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

// Section types for navigation
type SettingsSection = 'profile' | 'company' | 'preferences' | 'notifications' | 'data'

interface SectionNavItem {
  id: SettingsSection
  label: string
  icon: React.ReactNode
  description: string
}

const sections: SectionNavItem[] = [
  { id: 'profile', label: 'Profile', icon: <IconUser size={18} />, description: 'Your account details' },
  { id: 'company', label: 'Company', icon: <IconBuildings size={18} />, description: 'Company settings' },
  { id: 'preferences', label: 'Preferences', icon: <IconGear size={18} />, description: 'Display & formatting' },
  { id: 'notifications', label: 'Notifications', icon: <IconBell size={18} />, description: 'Email preferences' },
  { id: 'data', label: 'Data', icon: <IconDatabase size={18} />, description: 'Export & delete' },
]

/**
 * Main settings view with tabbed navigation.
 */
export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const { user, isAuthenticated } = useAuth()
  const isDemo = useIsDemo()
  const selectedCompanyId = useSelectedCompanyId()
  const setSelectedCompanyId = useSetSelectedCompanyId()
  const workosUserId = useWorkosUserId()

  // Fetch company data if authenticated and company selected - pass workosUserId for auth fallback
  const company = useQuery(
    api.companies.get,
    selectedCompanyId && user && !isDemo
      ? withWorkosUserId({ id: selectedCompanyId }, workosUserId)
      : 'skip'
  )

  // Also fetch all companies for auto-selection fallback - pass workosUserId for auth fallback
  const allCompanies = useQuery(
    api.companies.listByOwner,
    isAuthenticated && user && !isDemo ? withWorkosUserId({}, workosUserId) : 'skip'
  )

  // Auto-select first company if none selected but companies exist
  useEffect(() => {
    if (!selectedCompanyId && allCompanies && allCompanies.length > 0 && !isDemo) {
      console.log('[Settings] Auto-selecting first company:', allCompanies[0]._id)
      setSelectedCompanyId(allCompanies[0]._id)
    }
  }, [selectedCompanyId, allCompanies, setSelectedCompanyId, isDemo])

  // Debug logging for settings view state
  useEffect(() => {
    console.log('[Settings] Current state:', {
      isAuthenticated,
      isDemo,
      selectedCompanyId,
      companiesCount: allCompanies?.length ?? 'loading',
      companyLoaded: company ? company.name : 'null',
    })
  }, [isAuthenticated, isDemo, selectedCompanyId, allCompanies, company])

  // If not authenticated, show sign-in prompt
  if (!isAuthenticated && !isDemo) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <IconUser size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Sign in to access settings</h2>
          <p className="text-sm text-muted-foreground">
            Your settings and preferences are saved to your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* Section Navigation - Sidebar on desktop, horizontal on mobile */}
      <nav className="lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-muted/30">
        <div className="p-4 lg:p-6">
          <h1 className="text-lg font-medium mb-1">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
        <ul className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 px-2 lg:px-3 gap-1">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors whitespace-nowrap lg:whitespace-normal',
                  activeSection === section.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <span className="shrink-0">{section.icon}</span>
                <span className="flex-1 text-left hidden lg:block">
                  <span className="block font-medium">{section.label}</span>
                  <span className="block text-xs text-muted-foreground">{section.description}</span>
                </span>
                <span className="lg:hidden">{section.label}</span>
                <IconCaretRight size={16} className="hidden lg:block text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl">
          {activeSection === 'profile' && <ProfileSection user={user} isDemo={isDemo} />}
          {activeSection === 'company' && <CompanySection company={company} isDemo={isDemo} />}
          {activeSection === 'preferences' && <PreferencesSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'data' && <DataSection isDemo={isDemo} />}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// PROFILE SECTION
// =============================================================================

interface ProfileSectionProps {
  user: { id: string; email: string; name?: string; avatarUrl?: string } | null
  isDemo: boolean
}

function ProfileSection({ user, isDemo }: ProfileSectionProps) {
  const [name, setName] = useSyncedFormState(user?.name || '', [user?.name])
  const [isSaving, setIsSaving] = useState(false)
  const updateUser = useMutation(api.users.update)

  const handleSave = async () => {
    if (!user || isDemo) return

    setIsSaving(true)
    try {
      await updateUser({ name })
      toast.success('Profile updated')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-1">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your personal account information
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <IconUser size={32} className="text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{user?.name || 'User'}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Display Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={isDemo}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className="w-full px-3 py-2 text-sm bg-muted border border-border text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Email is managed through your authentication provider
        </p>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving || isDemo || name === user?.name}
          className="px-4 py-2 bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <IconLoader size={16} className="animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
        {isDemo && (
          <p className="mt-2 text-xs text-muted-foreground">
            Sign in to save profile changes
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// COMPANY SECTION
// =============================================================================

interface CompanySectionProps {
  company: {
    _id: string
    name: string
    currency: string
    fiscalYearEnd?: string
    industryCategory?: string
    taxRegistered?: boolean
    taxNumber?: string
  } | null | undefined
  isDemo: boolean
}

function CompanySection({ company, isDemo }: CompanySectionProps) {
  const [formData, setFormData] = useSyncedFormState({
    name: company?.name || '',
    currency: company?.currency || 'MYR',
    fiscalYearEnd: company?.fiscalYearEnd || 'December',
    industryCategory: company?.industryCategory || '',
    taxNumber: company?.taxNumber || '',
  }, [company])
  const [isSaving, setIsSaving] = useState(false)
  const updateCompany = useMutation(api.companies.update)
  const workosUserId = useWorkosUserId()

  const handleSave = async () => {
    if (!company || isDemo) return

    setIsSaving(true)
    try {
      await updateCompany({
        id: company._id as any,
        name: formData.name,
        currency: formData.currency,
        fiscalYearEnd: formData.fiscalYearEnd,
        industryCategory: formData.industryCategory,
        taxNumber: formData.taxNumber || undefined,
        workosUserId,
      })
      toast.success('Company settings updated')
    } catch (error) {
      toast.error('Failed to update company settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (!company && !isDemo) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-medium mb-1">Company</h2>
          <p className="text-sm text-muted-foreground">
            Select a company to manage its settings
          </p>
        </div>
        <div className="py-8 text-center text-sm text-muted-foreground">
          No company selected. Create or select a company from the sidebar.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-1">Company</h2>
        <p className="text-sm text-muted-foreground">
          Settings for {company?.name || 'your company'}
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Company Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={isDemo}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        />
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Default Currency</label>
        <select
          value={formData.currency}
          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          disabled={isDemo}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        >
          <option value="MYR">MYR - Malaysian Ringgit</option>
          <option value="USD">USD - US Dollar</option>
          <option value="SGD">SGD - Singapore Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
        </select>
      </div>

      {/* Fiscal Year End */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fiscal Year End</label>
        <select
          value={formData.fiscalYearEnd}
          onChange={(e) => setFormData({ ...formData, fiscalYearEnd: e.target.value })}
          disabled={isDemo}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        >
          {['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Industry Category</label>
        <select
          value={formData.industryCategory}
          onChange={(e) => setFormData({ ...formData, industryCategory: e.target.value })}
          disabled={isDemo}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        >
          <option value="">Select industry...</option>
          <option value="F&B">Food & Beverage</option>
          <option value="Retail">Retail</option>
          <option value="Services">Professional Services</option>
          <option value="Technology">Technology</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Education">Education</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Tax Number */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tax Registration Number</label>
        <input
          type="text"
          value={formData.taxNumber}
          onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
          placeholder="Optional"
          disabled={isDemo}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        />
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving || isDemo}
          className="px-4 py-2 bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <IconLoader size={16} className="animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
        {isDemo && (
          <p className="mt-2 text-xs text-muted-foreground">
            Sign in to save company settings
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// PREFERENCES SECTION
// =============================================================================

function PreferencesSection() {
  const { theme, setTheme } = useTheme()
  const isDemo = useIsDemo()
  const preferences = useQuery(api.settings.getUserPreferences)
  const updatePreferences = useMutation(api.settings.updateUserPreferences)
  const [isSaving, setIsSaving] = useState(false)

  // Local state initialized from backend
  const [dateFormat, setDateFormat] = useState(preferences?.dateFormat ?? 'DD/MM/YYYY')
  const [numberFormat, setNumberFormat] = useState(preferences?.numberFormat ?? '1,234.56')

  // Sync local state when preferences load
  useEffect(() => {
    if (preferences) {
      setDateFormat(preferences.dateFormat)
      setNumberFormat(preferences.numberFormat)
    }
  }, [preferences])

  const handleDateFormatChange = async (newFormat: string) => {
    setDateFormat(newFormat)
    if (isDemo) return

    setIsSaving(true)
    try {
      await updatePreferences({ dateFormat: newFormat })
      toast.success('Date format updated')
    } catch (error) {
      toast.error('Failed to save preference')
      setDateFormat(preferences?.dateFormat ?? 'DD/MM/YYYY')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNumberFormatChange = async (newFormat: string) => {
    setNumberFormat(newFormat)
    if (isDemo) return

    setIsSaving(true)
    try {
      await updatePreferences({ numberFormat: newFormat })
      toast.success('Number format updated')
    } catch (error) {
      toast.error('Failed to save preference')
      setNumberFormat(preferences?.numberFormat ?? '1,234.56')
    } finally {
      setIsSaving(false)
    }
  }

  const themes = [
    { value: 'light', label: 'Light', icon: <IconSun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <IconMoon size={16} /> },
    { value: 'system', label: 'System', icon: <IconDesktop size={16} /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-1">Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Customize how Reconciled looks and displays data
        </p>
      </div>

      {/* Theme */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Theme</label>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm border transition-colors',
                theme === t.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:border-foreground/50'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Theme is saved to your browser
        </p>
      </div>

      {/* Date Format */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date Format</label>
        <select
          value={dateFormat}
          onChange={(e) => handleDateFormatChange(e.target.value)}
          disabled={isSaving}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY (31/01/2025)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY (01/31/2025)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (2025-01-31)</option>
        </select>
      </div>

      {/* Number Format */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Number Format</label>
        <select
          value={numberFormat}
          onChange={(e) => handleNumberFormatChange(e.target.value)}
          disabled={isSaving}
          className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
        >
          <option value="1,234.56">1,234.56 (US/UK)</option>
          <option value="1.234,56">1.234,56 (Europe)</option>
          <option value="1 234.56">1 234.56 (ISO)</option>
        </select>
      </div>

      <div className="pt-4 border-t border-border">
        {isDemo ? (
          <p className="text-xs text-muted-foreground">
            Sign in to save preferences across devices
          </p>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <IconCheck size={12} className="text-green-600" />
            Preferences are saved to your account
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// NOTIFICATIONS SECTION
// =============================================================================

function NotificationsSection() {
  const isDemo = useIsDemo()
  const preferences = useQuery(api.settings.getUserPreferences)
  const updatePreferences = useMutation(api.settings.updateUserPreferences)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Local state initialized from backend
  const [emailNotifications, setEmailNotifications] = useState({
    reconciliationComplete: preferences?.emailNotifications?.reconciliationComplete ?? true,
    weeklyDigest: preferences?.emailNotifications?.weeklyDigest ?? false,
    newFeatures: preferences?.emailNotifications?.newFeatures ?? true,
  })

  // Sync local state when preferences load
  useEffect(() => {
    if (preferences?.emailNotifications) {
      setEmailNotifications({
        reconciliationComplete: preferences.emailNotifications.reconciliationComplete,
        weeklyDigest: preferences.emailNotifications.weeklyDigest,
        newFeatures: preferences.emailNotifications.newFeatures,
      })
    }
  }, [preferences])

  const toggleNotification = async (key: keyof typeof emailNotifications) => {
    const newValue = !emailNotifications[key]
    setEmailNotifications(prev => ({ ...prev, [key]: newValue }))

    if (isDemo) return

    setIsSaving(key)
    try {
      // Map frontend keys to backend field names
      const fieldMap: Record<string, string> = {
        reconciliationComplete: 'emailReconciliation',
        weeklyDigest: 'emailWeeklyDigest',
        newFeatures: 'emailProductUpdates',
      }
      await updatePreferences({ [fieldMap[key]]: newValue })
    } catch (error) {
      toast.error('Failed to save notification preference')
      setEmailNotifications(prev => ({ ...prev, [key]: !newValue }))
    } finally {
      setIsSaving(null)
    }
  }

  const notifications = [
    {
      key: 'reconciliationComplete' as const,
      label: 'Reconciliation Complete',
      description: 'Get notified when a reconciliation session is finished',
    },
    {
      key: 'weeklyDigest' as const,
      label: 'Weekly Digest',
      description: 'Summary of your reconciliation activity each week',
    },
    {
      key: 'newFeatures' as const,
      label: 'Product Updates',
      description: 'Learn about new features and improvements',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Choose what updates you receive by email
        </p>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.key}
            className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0"
          >
            <div>
              <p className="text-sm font-medium">{notification.label}</p>
              <p className="text-xs text-muted-foreground">{notification.description}</p>
            </div>
            <button
              onClick={() => toggleNotification(notification.key)}
              disabled={isSaving === notification.key}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors disabled:opacity-50',
                emailNotifications[notification.key] ? 'bg-foreground' : 'bg-muted'
              )}
              role="switch"
              aria-checked={emailNotifications[notification.key]}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-background transition-transform',
                  emailNotifications[notification.key] ? 'left-5' : 'left-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        {isDemo ? (
          <p className="text-xs text-muted-foreground">
            Sign in to save notification preferences
          </p>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <IconCheck size={12} className="text-green-600" />
            Preferences are saved to your account
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// DATA SECTION
// =============================================================================

interface DataSectionProps {
  isDemo: boolean
}

function DataSection({ isDemo }: DataSectionProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const { logout } = useAuth()

  const exportUserData = useMutation(api.settings.exportUserData)
  const deleteAccount = useMutation(api.settings.deleteAccount)

  const handleExport = async () => {
    if (isDemo) {
      toast.error('Sign in to export your data')
      return
    }

    setIsExporting(true)
    try {
      const data = await exportUserData()

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reconciled-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Data exported successfully')
    } catch (error: any) {
      // Check if rate limited
      if (error?.message?.includes('Rate limited')) {
        toast.error(error.message)
      } else {
        toast.error('Failed to export data')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return

    setIsDeleting(true)
    try {
      await deleteAccount()
      toast.success('Account deleted')
      await logout()
    } catch (error: any) {
      // Check if rate limited
      if (error?.message?.includes('Rate limited')) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete account')
      }
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-1">Data Management</h2>
        <p className="text-sm text-muted-foreground">
          Export your data or delete your account
        </p>
      </div>

      {/* Export Data */}
      <div className="p-4 border border-border">
        <div className="flex items-start gap-4">
          <IconDownload size={20} className="mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="text-sm font-medium">Export Your Data</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Download a copy of all your data including companies, transactions,
              reconciliation sessions, and settings.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting || isDemo}
              className="mt-3 px-3 py-1.5 text-sm border border-border hover:border-foreground/50 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <span className="flex items-center gap-2">
                  <IconLoader size={12} className="animate-spin" />
                  Exporting...
                </span>
              ) : (
                'Export Data (JSON)'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="p-4 border border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-4">
          <IconTrash size={20} className="mt-0.5 text-destructive" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-destructive">Delete Account</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently delete your account and all associated data. This action
              cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDemo}
              className="mt-3 px-3 py-1.5 text-sm text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {isDemo && (
        <p className="text-xs text-muted-foreground">
          Sign in to manage your data
        </p>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteConfirmation('')
        }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20">
            <IconWarning size={20} className="text-destructive shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">This action is irreversible</p>
              <p className="text-muted-foreground mt-1">
                All your data will be permanently deleted, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Your profile and account settings</li>
                <li>All companies and their settings</li>
                <li>All transactions and documents</li>
                <li>All reconciliation sessions and matches</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-destructive"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setDeleteConfirmation('')
              }}
              className="px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || isDeleting}
              className="px-4 py-2 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <IconLoader size={16} className="animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete My Account'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
