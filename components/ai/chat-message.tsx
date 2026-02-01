'use client'

import { cn } from '@/lib/utils'
import { IconSparkle, IconUser, IconCheckCircle, IconWarningCircle, IconXCircle } from '@/components/brand/icons'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  isStreaming?: boolean
  className?: string
}

// Match result interface for inline match cards
export interface MatchResult {
  cashId: string
  accrualId: string
  cashDescription?: string
  accrualDescription?: string
  confidence: number
  recommendation: 'MATCH' | 'REVIEW' | 'NO_MATCH'
  reason: string
}

export function ChatMessage({ role, content, isStreaming, className }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar - sharp corners (brand) */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 flex items-center justify-center',
          isUser
            ? 'bg-foreground'
            : 'bg-secondary'
        )}
      >
        {isUser ? (
          <IconUser size={14} className="text-background" />
        ) : (
          <IconSparkle size={14} className="text-muted-foreground" />
        )}
      </div>

      {/* Message Content - sharp corners (brand) */}
      <div
        className={cn(
          'flex-1 max-w-[85%]',
          'px-3.5 py-2.5 text-sm',
          isUser
            ? [
                'bg-foreground',
                'text-background',
                'assistant-message-user',
              ]
            : [
                'bg-card',
                'text-foreground',
                'border border-border',
                'assistant-message-ai',
              ]
        )}
      >
        {isUser ? (
          <p className="leading-relaxed">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-foreground">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-none pl-0 mb-3 space-y-1.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-4 mb-3 space-y-1.5 marker:text-muted-foreground">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-muted-foreground mt-2 flex-shrink-0" />
                    <span>{children}</span>
                  </li>
                ),
                code: ({ children }) => (
                  <code className="bg-secondary px-1.5 py-0.5 text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-foreground text-background p-3 overflow-x-auto text-xs font-mono border border-border">
                    {children}
                  </pre>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <span className="inline-flex items-center gap-0.5 ml-1">
            <span className="w-1.5 h-1.5 bg-muted-foreground animate-pulse" />
          </span>
        )}
      </div>
    </div>
  )
}

// Typing indicator component with refined animation - branded
export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      {/* Avatar - sharp corners */}
      <div className="flex-shrink-0 w-7 h-7 bg-secondary flex items-center justify-center">
        <IconSparkle size={14} className="text-muted-foreground" />
      </div>

      {/* Typing bubble - sharp corners */}
      <div className="px-4 py-3 bg-card border border-border assistant-message-ai">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-muted-foreground assistant-typing-dot"
              style={{
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Match result card for displaying AI analysis results inline in chat - branded
export function MatchResultCard({ match }: { match: MatchResult }) {
  const isMatch = match.recommendation === 'MATCH'
  const isReview = match.recommendation === 'REVIEW'

  return (
    <div
      className={cn(
        'relative p-4 text-sm overflow-hidden',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        'border',
        isMatch && 'bg-success-light border-success/30',
        isReview && 'bg-warning-light border-warning/30',
        !isMatch && !isReview && 'bg-secondary border-border'
      )}
    >
      {/* Confidence bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            isMatch && 'bg-success',
            isReview && 'bg-warning',
            !isMatch && !isReview && 'bg-muted-foreground'
          )}
          style={{ width: `${match.confidence}%` }}
        />
      </div>

      {/* Header with recommendation */}
      <div className="flex items-center justify-between mb-2 pt-1">
        <div className="flex items-center gap-2">
          {isMatch ? (
            <IconCheckCircle size={16} className="text-success" />
          ) : isReview ? (
            <IconWarningCircle size={16} className="text-warning" />
          ) : (
            <IconXCircle size={16} className="text-muted-foreground" />
          )}
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              isMatch && 'bg-success/20 text-success',
              isReview && 'bg-warning/20 text-warning',
              !isMatch && !isReview && 'bg-secondary text-muted-foreground'
            )}
          >
            {match.recommendation}
          </span>
        </div>
        <span className={cn(
          'text-xs font-mono',
          isMatch && 'text-success',
          isReview && 'text-warning',
          !isMatch && !isReview && 'text-muted-foreground'
        )}>
          {match.confidence}%
        </span>
      </div>

      {/* Transaction IDs */}
      <div className="text-xs mb-2 flex items-center gap-2">
        <span className="font-medium">{match.cashId}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-medium">{match.accrualId}</span>
      </div>

      {/* Reason */}
      <p className="text-xs text-muted-foreground line-clamp-2">{match.reason}</p>
    </div>
  )
}

// Analysis message component for streaming analysis results
interface AnalysisMessageProps {
  content: string
  matches: MatchResult[]
  isStreaming?: boolean
}

export function AnalysisMessage({ content, matches, isStreaming }: AnalysisMessageProps) {
  return (
    <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      {/* Avatar - sharp corners */}
      <div className="flex-shrink-0 w-7 h-7 bg-secondary flex items-center justify-center">
        <IconSparkle size={14} className="text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {/* Streaming text - sharp corners */}
        {content && (
          <div className="px-3.5 py-2.5 text-sm bg-card border border-border assistant-message-ai">
            <p className="leading-relaxed whitespace-pre-wrap font-mono text-xs">
              {content}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-muted-foreground animate-pulse ml-0.5 align-middle" />
              )}
            </p>
          </div>
        )}

        {/* Match result cards */}
        {matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((match, i) => (
              <MatchResultCard key={`${match.cashId}-${match.accrualId}-${i}`} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
