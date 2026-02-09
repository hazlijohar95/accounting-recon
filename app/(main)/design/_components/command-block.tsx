'use client'

import { useState } from 'react'

interface CommandBlockProps {
  label: string
  command: string
}

/**
 * A terminal command display with copy-to-clipboard.
 * Used for shell commands (vs CodeBlock which is for source code).
 */
export function CommandBlock({ label, command }: CommandBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-border">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm font-mono overflow-x-auto">
        <code>{command}</code>
      </pre>
    </div>
  )
}
