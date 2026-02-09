import { IconLoader } from '@/components/brand/icons'

export default function DesignLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <IconLoader size={24} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading design system...</p>
      </div>
    </div>
  )
}
