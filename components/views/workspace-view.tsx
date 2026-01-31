'use client'

/**
 * Workspace View Component.
 *
 * The main workspace page for the agentic spreadsheet feature.
 * Shows a list of workspaces with smooth animations and brand-consistent styling.
 *
 * @module components/views/workspace-view
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useIsDemo, useSelectedCompanyId, useDemoWorkspaceData, useSetShowPaywall } from '@/lib/store'
import { useAuth } from '@/components/auth-provider'
import {
  BrandedEmptyState,
  Skeleton,
  PremiumButton,
  ButtonSecondary,
  Logo3DLoading,
} from '@/components/brand'
import { WorksheetGrid } from '@/components/workspace/worksheet-grid'
import { Plus, FolderOpen, Trash2, Table2, ArrowLeft, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Geometric workspace icon for empty states
 */
function WorkspaceIllustration({ className }: { className?: string }) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      className={cn('text-muted-foreground/40', className)}
    >
      {/* Grid pattern - represents spreadsheet */}
      <rect x="8" y="8" width="20" height="12" fill="currentColor" />
      <rect x="32" y="8" width="24" height="12" fill="currentColor" fillOpacity="0.6" />
      <rect x="8" y="24" width="20" height="12" fill="currentColor" fillOpacity="0.4" />
      <rect x="32" y="24" width="24" height="12" fill="currentColor" fillOpacity="0.3" />
      <rect x="8" y="40" width="20" height="12" fill="currentColor" fillOpacity="0.2" />
      <rect x="32" y="40" width="24" height="12" fill="currentColor" fillOpacity="0.15" />
      {/* AI sparkle accent */}
      <rect x="48" y="48" width="8" height="8" fill="var(--chart-5)" fillOpacity="0.8" />
    </svg>
  )
}

/**
 * Main workspace view with workspace list and worksheet grid.
 */
export function WorkspaceView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemo = useIsDemo()
  const companyId = useSelectedCompanyId()
  const { isAuthenticated, user } = useAuth()
  const setShowPaywall = useSetShowPaywall()
  const {
    workspaces: demoWorkspaces,
    worksheets: demoWorksheets,
    columns: demoColumns,
    rows: demoRows,
  } = useDemoWorkspaceData()

  // Selected workspace/worksheet from URL params
  const workspaceId = searchParams.get('ws') as Id<'workspaces'> | string | null
  const worksheetId = searchParams.get('sheet') as Id<'worksheets'> | string | null

  // State
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Guard action - placeholder for future subscription validation
  // For now, allow all actions (no blocking)
  const guardAction = () => {
    // TODO: Add subscription validation later
    // if (!hasActiveSubscription) {
    //   setShowPaywall(true)
    //   return true
    // }
    return false
  }

  // Queries (skip in demo mode)
  const workspaces = useQuery(
    api.workspaces.listWorkspaces,
    companyId && !isDemo ? { companyId } : 'skip'
  )

  const workspaceData = useQuery(
    api.workspaces.getWorkspaceWithWorksheets,
    workspaceId && !isDemo ? { workspaceId: workspaceId as Id<'workspaces'> } : 'skip'
  )

  const worksheetData = useQuery(
    api.workspaces.getWorksheetData,
    worksheetId && !isDemo ? { worksheetId: worksheetId as Id<'worksheets'> } : 'skip'
  )

  // Demo data helpers
  const getDemoWorkspaceData = (wsId: string) => {
    const workspace = demoWorkspaces.find(w => w._id === wsId)
    const sheets = demoWorksheets.filter(s => s.workspaceId === wsId)
    return workspace ? { ...workspace, worksheets: sheets } : null
  }

  const getDemoWorksheetData = (sheetId: string) => {
    const worksheet = demoWorksheets.find(s => s._id === sheetId)
    const cols = demoColumns.filter(c => c.worksheetId === sheetId)
    const rowData = demoRows.filter(r => r.worksheetId === sheetId)
    return worksheet ? { worksheet, columns: cols, rows: rowData } : null
  }

  // Mutations
  const createWorkspace = useMutation(api.workspaces.createWorkspace)
  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace)
  const createWorksheet = useMutation(api.workspaces.createWorksheet)

  // Handlers
  const handleCreateWorkspace = async () => {
    if (guardAction()) return
    if (!newWorkspaceName.trim() || !companyId || !user?.id) return

    try {
      const wsId = await createWorkspace({
        companyId,
        name: newWorkspaceName.trim(),
        userId: user.id as Id<'users'>,
      })

      setNewWorkspaceName('')
      setIsCreating(false)
      router.push(`/workspace?ws=${wsId}`)
    } catch (error) {
      console.error('Failed to create workspace:', error)
    }
  }

  const handleDeleteWorkspace = async (wsId: Id<'workspaces'> | string) => {
    if (guardAction()) return
    if (!user?.id) return
    if (!confirm('Delete this workspace and all its data?')) return

    try {
      await deleteWorkspace({
        workspaceId: wsId as Id<'workspaces'>,
        userId: user.id as Id<'users'>,
      })
      if (workspaceId === wsId) {
        router.push('/workspace')
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error)
    }
  }

  const handleSelectWorkspace = (wsId: Id<'workspaces'> | string) => {
    router.push(`/workspace?ws=${wsId}`)
  }

  const handleSelectWorksheet = (sheetId: Id<'worksheets'> | string) => {
    router.push(`/workspace?ws=${workspaceId}&sheet=${sheetId}`)
  }

  const handleAddWorksheet = async () => {
    if (guardAction()) return
    if (!workspaceId || !user?.id) return

    const name = prompt('Worksheet name:')
    if (!name?.trim()) return

    try {
      const sheetId = await createWorksheet({
        workspaceId: workspaceId as Id<'workspaces'>,
        name: name.trim(),
        userId: user.id as Id<'users'>,
      })
      router.push(`/workspace?ws=${workspaceId}&sheet=${sheetId}`)
    } catch (error) {
      console.error('Failed to create worksheet:', error)
    }
  }

  const handleStartCreating = () => {
    if (guardAction()) return
    setIsCreating(true)
  }

  // Demo mode - show full demo experience
  if (isDemo) {
    // Demo worksheet view (full grid)
    if (workspaceId && worksheetId) {
      const demoWsData = getDemoWorkspaceData(workspaceId as string)
      const demoSheetData = getDemoWorksheetData(worksheetId as string)

      if (demoSheetData) {
        return (
          <div className="h-full flex flex-col page-enter">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center gap-4 bg-background">
              <button
                onClick={() => router.push(`/workspace?ws=${workspaceId}`)}
                className="p-2 -m-2 hover:bg-secondary transition-colors"
                aria-label="Back to worksheets"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-medium truncate">{demoWsData?.name}</h1>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-chart-5/10 text-chart-5 uppercase tracking-wide">Demo</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{demoSheetData.worksheet.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-label">
                  {demoSheetData.rows.length} rows
                </span>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-hidden">
              <WorksheetGrid
                worksheetId={worksheetId as Id<'worksheets'>}
                columns={demoSheetData.columns as unknown as Parameters<typeof WorksheetGrid>[0]['columns']}
                rows={demoSheetData.rows as unknown as Parameters<typeof WorksheetGrid>[0]['rows']}
                userId={'demo-user' as Id<'users'>}
                isDemo={true}
              />
            </div>
          </div>
        )
      }
    }

    // Demo workspace selected - show worksheets
    if (workspaceId) {
      const demoWsData = getDemoWorkspaceData(workspaceId as string)

      if (demoWsData) {
        return (
          <div className="p-6 space-y-6 page-enter">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/workspace')}
                  className="p-2 -m-2 hover:bg-secondary transition-colors"
                  aria-label="Back to workspaces"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold">{demoWsData.name}</h1>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-chart-5/10 text-chart-5 uppercase tracking-wide">Demo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {demoWsData.worksheets.length} worksheet{demoWsData.worksheets.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <PremiumButton
                onClick={handleAddWorksheet}
                icon={<Plus size={14} />}
                size="sm"
              >
                Add Sheet
              </PremiumButton>
            </div>

            {/* Worksheets grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {demoWsData.worksheets.map((sheet, index: number) => (
                <button
                  key={sheet._id}
                  onClick={() => handleSelectWorksheet(sheet._id)}
                  className="p-4 border border-border hover:border-foreground/30 bg-background hover:bg-secondary/30 transition-all text-left group list-item-enter card-interactive"
                  style={{ '--item-index': index } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between">
                    <Table2 size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <h3 className="mt-3 font-medium text-sm">{sheet.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {new Date(sheet.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )
      }
    }

    // Demo workspace list (home)
    return (
      <div className={cn('p-6 space-y-6', mounted && 'page-enter')}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Workspaces</h1>
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-chart-5/10 text-chart-5 uppercase tracking-wide">Demo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered spreadsheets for data enrichment
            </p>
          </div>
          <PremiumButton
            onClick={handleStartCreating}
            icon={<Plus size={14} />}
            size="sm"
          >
            New Workspace
          </PremiumButton>
        </div>

        {/* Demo banner */}
        <div className="p-4 border border-chart-5/30 bg-chart-5/5">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="text-chart-5 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Exploring Demo Mode</p>
              <p className="text-xs text-muted-foreground">
                Browse sample workspaces to see AI-powered data enrichment in action.
                Switch to Real mode and sign in to create your own workspaces.
              </p>
            </div>
          </div>
        </div>

        {/* Demo workspaces grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {demoWorkspaces.map((workspace, index: number) => (
            <div
              key={workspace._id}
              onClick={() => handleSelectWorkspace(workspace._id)}
              className="p-4 border border-border hover:border-foreground/30 bg-background hover:bg-secondary/30 transition-all group relative list-item-enter card-interactive cursor-pointer"
              style={{ '--item-index': index } as React.CSSProperties}
            >
              <div className="flex items-start justify-between">
                <FolderOpen size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteWorkspace(workspace._id)
                  }}
                  className="p-1.5 -m-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  aria-label="Delete workspace"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="mt-3 font-medium text-sm">{workspace.name}</h3>
              {workspace.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {workspace.description}
                </p>
              )}
              <p className="text-label mt-3">
                Updated {new Date(workspace.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 page-enter">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <Logo3DLoading size={120} />
          </div>
          <div className="flex items-center justify-center gap-1 mb-6">
            <div className="w-8 h-0.5 bg-foreground/20" />
            <div className="w-2 h-2 bg-foreground/40" />
            <div className="w-8 h-0.5 bg-foreground/20" />
          </div>
          <h2 className="text-lg font-medium mb-2">Sign In Required</h2>
          <p className="text-sm text-muted-foreground">
            Please sign in to access workspaces.
          </p>
        </div>
      </div>
    )
  }

  // Loading workspaces
  if (workspaces === undefined) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-border p-4 space-y-3" style={{ '--item-index': i } as React.CSSProperties}>
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-24 mt-3" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Worksheet view (full grid)
  if (workspaceId && worksheetId && worksheetData) {
    return (
      <div className="h-full flex flex-col page-enter">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-4 bg-background">
          <button
            onClick={() => router.push(`/workspace?ws=${workspaceId}`)}
            className="p-2 -m-2 hover:bg-secondary transition-colors"
            aria-label="Back to worksheets"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium truncate">{workspaceData?.name}</h1>
            <p className="text-xs text-muted-foreground truncate">{worksheetData.worksheet.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label">
              {worksheetData.rows.length} rows
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-hidden">
          <WorksheetGrid
            worksheetId={worksheetId as Id<'worksheets'>}
            columns={worksheetData.columns}
            rows={worksheetData.rows}
            userId={user?.id as Id<'users'>}
          />
        </div>
      </div>
    )
  }

  // Workspace selected - show worksheets
  if (workspaceId && workspaceData) {
    return (
      <div className="p-6 space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/workspace')}
              className="p-2 -m-2 hover:bg-secondary transition-colors"
              aria-label="Back to workspaces"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-semibold">{workspaceData.name}</h1>
              <p className="text-sm text-muted-foreground">
                {workspaceData.worksheets.length} worksheet{workspaceData.worksheets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <PremiumButton
            onClick={handleAddWorksheet}
            icon={<Plus size={14} />}
            size="sm"
          >
            Add Sheet
          </PremiumButton>
        </div>

        {/* Worksheets grid */}
        {workspaceData.worksheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Table2 size={48} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-medium mb-2">No worksheets yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create a worksheet to start adding data
            </p>
            <PremiumButton
              onClick={handleAddWorksheet}
              icon={<Plus size={14} />}
              size="sm"
            >
              Add Sheet
            </PremiumButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workspaceData.worksheets.map((sheet: { _id: Id<'worksheets'>; name: string; updatedAt: number }, index: number) => (
              <button
                key={sheet._id}
                onClick={() => handleSelectWorksheet(sheet._id)}
                className="p-4 border border-border hover:border-foreground/30 bg-background hover:bg-secondary/30 transition-all text-left group list-item-enter card-interactive"
                style={{ '--item-index': index } as React.CSSProperties}
              >
                <div className="flex items-start justify-between">
                  <Table2 size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <h3 className="mt-3 font-medium text-sm">{sheet.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {new Date(sheet.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Workspace list (home)
  return (
    <div className={cn('p-6 space-y-6', mounted && 'page-enter')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered spreadsheets for data enrichment
          </p>
        </div>
        {!isCreating && (
          <PremiumButton
            onClick={handleStartCreating}
            icon={<Plus size={14} />}
            size="sm"
          >
            New Workspace
          </PremiumButton>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="p-4 border border-border bg-secondary/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Create Workspace</h3>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewWorkspaceName('')
              }}
              className="p-1 hover:bg-secondary transition-colors"
              aria-label="Cancel"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name..."
              className="flex-1 px-3 py-2 text-sm border border-border bg-background focus:outline-none focus:border-foreground transition-colors"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
            />
            <PremiumButton
              onClick={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim()}
              size="sm"
            >
              Create
            </PremiumButton>
          </div>
        </div>
      )}

      {/* Empty state */}
      {workspaces.length === 0 && !isCreating && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6">
            <WorkspaceIllustration />
          </div>
          <div className="flex items-center justify-center gap-1 mb-4">
            <div className="w-6 h-0.5 bg-foreground/20" />
            <Sparkles size={12} className="text-chart-5" />
            <div className="w-6 h-0.5 bg-foreground/20" />
          </div>
          <h3 className="text-sm font-medium mb-2">No workspaces yet</h3>
          <p className="text-xs text-muted-foreground mb-6 max-w-xs">
            Create your first workspace to start enriching data with AI agents
          </p>
          <PremiumButton
            onClick={handleStartCreating}
            icon={<Plus size={14} />}
          >
            Create Workspace
          </PremiumButton>
        </div>
      )}

      {/* Workspaces grid */}
      {workspaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workspaces.map((workspace: { _id: Id<'workspaces'>; name: string; description?: string; updatedAt: number }, index: number) => (
            <div
              key={workspace._id}
              onClick={() => handleSelectWorkspace(workspace._id)}
              className="p-4 border border-border hover:border-foreground/30 bg-background hover:bg-secondary/30 transition-all group relative list-item-enter card-interactive cursor-pointer"
              style={{ '--item-index': index } as React.CSSProperties}
            >
              <div className="flex items-start justify-between">
                <FolderOpen size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteWorkspace(workspace._id)
                  }}
                  className="p-1.5 -m-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  aria-label="Delete workspace"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="mt-3 font-medium text-sm">{workspace.name}</h3>
              {workspace.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {workspace.description}
                </p>
              )}
              <p className="text-label mt-3">
                Updated {new Date(workspace.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
