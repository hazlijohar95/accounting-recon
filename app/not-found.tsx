import Link from 'next/link'
import { IconQuestion, IconHouse } from '@/components/brand/icons'

export default function NotFound() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
        <div className="rounded-full bg-muted p-4">
          <IconQuestion size={32} className="text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">404</h1>
          <h2 className="text-xl font-semibold">Page not found</h2>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          <IconHouse size={16} />
          Back to home
        </Link>
      </div>
    </div>
  )
}
