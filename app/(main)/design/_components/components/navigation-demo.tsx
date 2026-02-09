'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  IconSquaresFour,
  IconUpload,
  IconGitDiff,
  IconFileText,
} from '@/components/brand/icons'
import { CodeBlock } from '../code-block'

export function NavigationDemo() {
  const [activeNavItem, setActiveNavItem] = useState(0)
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Navigation
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Sidebar Nav */}
        <div className="border border-border p-6 space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Sidebar Navigation</h4>
          <div className="bg-secondary/30 p-2">
            <ul className="space-y-1">
              {[
                { icon: <IconSquaresFour size={16} />, label: 'Dashboard' },
                { icon: <IconUpload size={16} />, label: 'Upload' },
                { icon: <IconGitDiff size={16} />, label: 'Reconcile' },
                { icon: <IconFileText size={16} />, label: 'Reports' },
              ].map((item, i) => (
                <li key={item.label}>
                  <button
                    onClick={() => setActiveNavItem(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                      activeNavItem === i
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border border-border p-6 space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Tab Navigation</h4>
          <div className="flex border-b border-border">
            {['Pending', 'Matched', 'Suspense'].map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={cn(
                  'px-4 py-3 text-sm capitalize transition-colors',
                  activeTab === i
                    ? 'border-b-2 border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab} ({i + 1})
              </button>
            ))}
          </div>
          <CodeBlock
            code={`<div className="flex border-b border-border">
  {tabs.map((tab, i) => (
    <button
      className={cn(
        'px-4 py-3 text-sm transition-colors',
        active === i
          ? 'border-b-2 border-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {tab}
    </button>
  ))}
</div>`}
            language="tsx"
          />
        </div>
      </div>
    </div>
  )
}
