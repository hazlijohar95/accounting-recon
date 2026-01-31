'use client'

import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks'

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  className?: string
}

export function CodeBlock({ code, language = 'tsx', showLineNumbers = false, className }: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard()

  const lines = code.split('\n')

  return (
    <div className={cn('relative group', className)}>
      <div className="bg-secondary border border-border overflow-x-auto">
        <div className="p-4 font-mono text-xs">
          {showLineNumbers ? (
            <table className="border-collapse">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td className="pr-4 text-muted-foreground select-none text-right align-top">
                      {i + 1}
                    </td>
                    <td className="whitespace-pre">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="whitespace-pre-wrap">{code}</pre>
          )}
        </div>
      </div>
      <button
        onClick={() => copy(code)}
        className="absolute top-2 right-2 p-1.5 bg-background border border-border opacity-60 hover:opacity-100 transition-opacity cursor-copy"
      >
        {copied ? (
          <Check className="w-3 h-3 text-foreground" />
        ) : (
          <Copy className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
      {language && (
        <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground uppercase tracking-wider">
          {language}
        </div>
      )}
    </div>
  )
}
