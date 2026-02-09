'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { IconX } from '@/components/brand/icons'
import { CodeBlock } from '../code-block'

type ButtonState = 'default' | 'hover' | 'active' | 'disabled'

function StateToggle({
  state,
  onChange,
}: {
  state: ButtonState
  onChange: (state: ButtonState) => void
}) {
  const states: ButtonState[] = ['default', 'hover', 'active', 'disabled']
  return (
    <div className="flex gap-1 text-xs">
      {states.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'px-2 py-1 capitalize',
            state === s ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

function ButtonPreview({ variant, state }: { variant: 'primary' | 'secondary' | 'destructive' | 'icon'; state: ButtonState }) {
  const baseClasses = 'px-4 py-2 text-sm transition-colors flex items-center gap-2'

  const variants = {
    primary: cn(
      baseClasses,
      'bg-foreground text-background',
      state === 'hover' && 'bg-foreground/90',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
    secondary: cn(
      baseClasses,
      'border border-border',
      state === 'hover' && 'bg-secondary',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
    destructive: cn(
      baseClasses,
      'bg-destructive text-destructive-foreground',
      state === 'hover' && 'bg-destructive/90',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
    icon: cn(
      'p-1.5 text-muted-foreground transition-colors',
      state === 'hover' && 'text-foreground bg-secondary',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
  }

  const labels = {
    primary: 'Primary Action',
    secondary: 'Secondary',
    destructive: 'Delete',
    icon: null,
  }

  return (
    <button className={variants[variant]} disabled={state === 'disabled'}>
      {variant === 'icon' ? <IconX size={16} /> : labels[variant]}
    </button>
  )
}

export function ButtonsDemo() {
  const [buttonState, setButtonState] = useState<ButtonState>('default')

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Buttons
      </h3>

      <div className="border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Preview state:</span>
          <StateToggle state={buttonState} onChange={setButtonState} />
        </div>

        <div className="flex items-center gap-4">
          <ButtonPreview variant="primary" state={buttonState} />
          <ButtonPreview variant="secondary" state={buttonState} />
          <ButtonPreview variant="destructive" state={buttonState} />
          <ButtonPreview variant="icon" state={buttonState} />
        </div>

        <CodeBlock
          code={`// Primary
<button className="px-4 py-2 bg-foreground text-background text-sm hover:bg-foreground/90">
  Primary Action
</button>

// Secondary
<button className="px-4 py-2 border border-border text-sm hover:bg-secondary">
  Secondary
</button>

// Destructive
<button className="px-4 py-2 bg-destructive text-destructive-foreground text-sm">
  Delete
</button>

// Icon
<button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
  <IconX size={16} />
</button>`}
          language="tsx"
        />
      </div>
    </div>
  )
}
