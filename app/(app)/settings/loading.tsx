/**
 * Settings page loading skeleton.
 */
export default function SettingsLoading() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 animate-pulse">
      {/* Sidebar skeleton */}
      <nav className="lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-muted/30">
        <div className="p-4 lg:p-6">
          <div className="h-6 w-24 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </div>
        <div className="px-2 lg:px-3 pb-2 lg:pb-4 space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </nav>

      {/* Content skeleton */}
      <div className="flex-1 p-6 max-w-2xl">
        <div className="space-y-6">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
