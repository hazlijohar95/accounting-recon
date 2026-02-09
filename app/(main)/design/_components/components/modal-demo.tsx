import { IconX } from '@/components/brand/icons'
import { CodeBlock } from '../code-block'

export function ModalDemo() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Modal
      </h3>

      <div className="border border-border p-6 space-y-4">
        <div className="relative bg-muted/50 p-8">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

          <div className="relative bg-background border border-border max-w-md mx-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Modal Title</h4>
                <p className="text-xs text-muted-foreground mt-1">Supporting text</p>
              </div>
              <button className="p-2 hover:bg-secondary transition-colors">
                <IconX size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Modal content goes here.</p>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button className="px-4 py-2 border border-border text-sm hover:bg-secondary">
                Cancel
              </button>
              <button className="px-4 py-2 bg-foreground text-background text-sm hover:bg-foreground/90">
                Confirm
              </button>
            </div>
          </div>
        </div>

        <CodeBlock
          code={`<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

  {/* Modal */}
  <div className="relative bg-background border border-border">
    <div className="p-4 border-b border-border flex items-center justify-between">
      <h4 className="text-sm font-medium">Title</h4>
      <button className="p-2 hover:bg-secondary">
        <IconX size={16} />
      </button>
    </div>
    <div className="p-4">Content</div>
    <div className="p-4 border-t border-border flex justify-end gap-2">
      <button className="px-4 py-2 border border-border">Cancel</button>
      <button className="px-4 py-2 bg-foreground text-background">Confirm</button>
    </div>
  </div>
</div>`}
          language="tsx"
        />
      </div>
    </div>
  )
}
