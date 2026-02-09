'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { IconUpload, IconCheck } from '@/components/brand/icons'
import { CodeBlock } from '../code-block'

export function FormInputsDemo() {
  const [checkboxChecked, setCheckboxChecked] = useState(false)

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Form Inputs
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Text Input */}
        <div className="border border-border p-6 space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Text Input</h4>
          <input
            type="text"
            placeholder="Enter text..."
            className="w-full px-3 py-2 border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
          />
          <CodeBlock
            code={`<input
  type="text"
  placeholder="Enter text..."
  className="w-full px-3 py-2 border border-border bg-background text-sm
    placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
/>`}
            language="tsx"
          />
        </div>

        {/* File Input */}
        <div className="border border-border p-6 space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">File Input</h4>
          <label className="block w-full border border-dashed border-border p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="file" className="hidden" />
            <div className="text-center">
              <IconUpload size={24} className="mx-auto text-muted-foreground" />
              <span className="text-sm text-muted-foreground mt-2 block">
                Click to upload
              </span>
            </div>
          </label>
          <CodeBlock
            code={`<label className="block border border-dashed border-border p-4 cursor-pointer hover:bg-secondary/50">
  <input type="file" className="hidden" />
  <IconUpload size={24} className="mx-auto text-muted-foreground" />
  <span className="text-sm text-muted-foreground">Click to upload</span>
</label>`}
            language="tsx"
          />
        </div>

        {/* Checkbox */}
        <div className="border border-border p-6 space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Checkbox</h4>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              onClick={() => setCheckboxChecked(!checkboxChecked)}
              className={cn(
                'w-5 h-5 border flex items-center justify-center transition-colors',
                checkboxChecked ? 'bg-foreground border-foreground' : 'border-border'
              )}
            >
              {checkboxChecked && <IconCheck size={12} className="text-background" />}
            </button>
            <span className="text-sm">Enable feature</span>
          </label>
          <CodeBlock
            code={`<button
  className={cn(
    'w-5 h-5 border flex items-center justify-center',
    checked ? 'bg-foreground border-foreground' : 'border-border'
  )}
>
  {checked && <IconCheck size={12} className="text-background" />}
</button>`}
            language="tsx"
          />
        </div>
      </div>
    </div>
  )
}
