'use client'

/**
 * Worksheet Chat Component.
 *
 * A conversational AI sidebar for querying spreadsheet data naturally.
 * Uses the worksheet context to answer questions about the data.
 *
 * @module components/workspace/worksheet-chat
 */

import * as React from 'react'
import { useChat, UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import {
  IconX,
  IconSend,
  IconSparkle,
  IconTrash,
  IconLoader,
  IconCopy,
  IconCheck,
} from '@/components/brand/icons'
import { buildWorksheetContext, WorksheetContext } from '@/lib/ai/worksheet-context'
import ReactMarkdown from 'react-markdown'

type WorksheetColumn = Doc<'worksheetColumns'>
type WorksheetRow = Doc<'worksheetRows'>

interface WorksheetChatProps {
  worksheetId: Id<'worksheets'>
  worksheetName: string
  columns: WorksheetColumn[]
  rows: WorksheetRow[]
  workosUserId?: string
  onClose: () => void
  className?: string
}

// Helper to extract text content from message parts
function getMessageText(message: UIMessage): string {
  return message.parts
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
}

// AI Icon for chat
function AIIcon({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn('w-4 h-4', className)}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="4" height="4" fill="currentColor" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '0ms' }} />
      <rect x="6" y="1" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '100ms' }} />
      <rect x="11" y="1" width="4" height="4" fill="currentColor" opacity="0.3" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '200ms' }} />
      <rect x="1" y="6" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '100ms' }} />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '200ms' }} />
      <rect x="11" y="6" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '300ms' }} />
      <rect x="1" y="11" width="4" height="4" fill="currentColor" opacity="0.3" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '200ms' }} />
      <rect x="6" y="11" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '300ms' }} />
      <rect x="11" y="11" width="4" height="4" fill="currentColor" className={animate ? 'animate-pulse' : ''} style={{ animationDelay: '400ms' }} />
    </svg>
  )
}

/**
 * Message bubble component with copy button for assistant messages
 * and markdown rendering
 */
function MessageBubble({ message }: { message: UIMessage }) {
  const [copied, setCopied] = React.useState(false)
  const text = getMessageText(message)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <div className="w-6 h-6 bg-chart-5/10 flex items-center justify-center shrink-0">
          <AIIcon className="text-chart-5" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] px-3 py-2 text-sm relative group',
          message.role === 'user'
            ? 'bg-foreground text-background'
            : 'bg-muted'
        )}
      >
        {message.role === 'assistant' ? (
          <>
            {/* Copy button - shows on hover */}
            <button
              onClick={handleCopy}
              className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-background/50 transition-opacity"
              title={copied ? 'Copied!' : 'Copy response'}
            >
              {copied ? (
                <IconCheck size={12} className="text-success" />
              ) : (
                <IconCopy size={12} className="text-muted-foreground" />
              )}
            </button>
            {/* Markdown rendered content */}
            <div className="prose-chat break-words">
              <ReactMarkdown
                components={{
                  // Custom styling for markdown elements to match design system
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children, className }) => {
                    // Check if it's inline code (no className) or code block
                    const isInline = !className
                    return isInline ? (
                      <code className="px-1 py-0.5 bg-background/50 text-xs font-mono">{children}</code>
                    ) : (
                      <code className="block px-2 py-1.5 bg-background/50 text-xs font-mono overflow-x-auto my-2">{children}</code>
                    )
                  },
                  pre: ({ children }) => <pre className="my-2">{children}</pre>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  a: ({ href, children }) => (
                    <a href={href} className="text-chart-5 underline underline-offset-2 hover:text-chart-5/80" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-muted-foreground/30 pl-2 my-2 text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => <h1 className="text-base font-semibold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {text}
          </div>
        )}
      </div>
    </div>
  )
}

export function WorksheetChat({
  worksheetId,
  worksheetName,
  columns,
  rows,
  workosUserId,
  onClose,
  className,
}: WorksheetChatProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [input, setInput] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Track persisted message IDs to avoid duplicate persistence
  const persistedMessageIds = React.useRef<Set<string>>(new Set())

  // Convex mutations for persisting chat history
  const addMessage = useMutation(api.worksheetChat.addMessage)
  const clearHistory = useMutation(api.worksheetChat.clearHistory)

  // Fetch existing messages
  const existingMessages = useQuery(api.worksheetChat.getMessages, {
    worksheetId,
    limit: 50,
    workosUserId,
  })

  // Build worksheet context for AI (auto-calculates optimal sample size)
  const worksheetContext = React.useMemo<WorksheetContext>(() => {
    return buildWorksheetContext(worksheetName, columns, rows)
  }, [worksheetName, columns, rows])

  // Convert existing messages to UIMessage format
  const initialMessages = React.useMemo<UIMessage[]>(() => {
    if (!existingMessages) return []
    return existingMessages.map((msg: Doc<'worksheetMessages'>) => ({
      id: msg._id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      parts: [{ type: 'text' as const, text: msg.content }],
      createdAt: new Date(msg.createdAt),
    }))
  }, [existingMessages])

  const { messages, sendMessage, setMessages } = useChat({
    id: `worksheet-chat-${worksheetId}`,
    transport: new DefaultChatTransport({
      api: '/api/chat/worksheet',
      body: { worksheetContext },
    }),
  })

  // Sync initial messages when they change
  React.useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages)
    }
  }, [initialMessages, messages.length, setMessages])

  // Check if streaming is active
  const isLoading = messages.length > 0 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    getMessageText(messages[messages.length - 1]).length === 0 &&
    isPending

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isPending) return

    setIsPending(true)
    setError(null)

    try {
      // Persist user message first
      await addMessage({
        worksheetId,
        role: 'user',
        content: input,
        workosUserId,
      })

      // Send to AI
      await sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: input }],
      })

      setInput('')
    } catch (err: unknown) {
      // Surface rate limit and other errors to user
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
        setError('Rate limit reached. Please wait a moment and try again.')
      } else if (errorMessage.toLowerCase().includes('insufficient')) {
        setError('Insufficient credits. Please upgrade your plan.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsPending(false)
    }
  }

  // Persist assistant messages when they complete
  React.useEffect(() => {
    if (messages.length === 0) return
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && !isPending) {
      const content = getMessageText(lastMessage)
      if (content && content.length > 0) {
        // Check if we already persisted this message by its ID (not content)
        const messageId = lastMessage.id
        if (!persistedMessageIds.current.has(messageId)) {
          persistedMessageIds.current.add(messageId)
          addMessage({
            worksheetId,
            role: 'assistant',
            content,
            workosUserId,
          })
        }
      }
    }
  }, [messages, isPending, addMessage, worksheetId, workosUserId])

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Clear chat history handler
  const handleClearHistory = async () => {
    if (!confirm('Clear chat history?')) return
    await clearHistory({ worksheetId, workosUserId })
    setMessages([])
  }

  // Suggested questions
  const suggestedQuestions = [
    `What's the total count of rows?`,
    `Summarize the data in this worksheet`,
    `Are there any empty cells?`,
    `What are the unique values in the first column?`,
  ]

  return (
    <div className={cn(
      'flex flex-col h-full bg-background border-l border-border',
      'animate-in slide-in-from-right-2 duration-200',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <AIIcon className="text-chart-5" animate={isPending} />
          <span className="text-sm font-medium">Chat with Data</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 hover:bg-secondary transition-colors"
            title="Clear history"
          >
            <IconTrash size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary transition-colors"
            title="Close chat"
          >
            <IconX size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <AIIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-4">
              Ask questions about your worksheet data
            </p>
            <div className="space-y-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="block w-full text-left text-xs px-3 py-2 bg-muted/50 hover:bg-muted transition-colors truncate"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isPending && messages.length > 0 && getMessageText(messages[messages.length - 1]).length === 0 && (
          <div className="flex gap-2">
            <div className="w-6 h-6 bg-chart-5/10 flex items-center justify-center shrink-0">
              <AIIcon className="text-chart-5" animate />
            </div>
            <div className="bg-muted px-3 py-2">
              <div className="flex items-center gap-1.5">
                <IconLoader size={12} className="animate-spin text-chart-5" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context info with sampling warning */}
      <div className={cn(
        "px-4 py-2 border-t border-border",
        worksheetContext.sampling.isSampled ? "bg-amber-500/10" : "bg-muted/20"
      )}>
        {worksheetContext.sampling.isSampled ? (
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-xs">⚠️</span>
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              <strong>Analyzing {worksheetContext.sampling.sampleSize} of {worksheetContext.sampling.totalRows} rows</strong>
              {' '}({worksheetContext.sampling.samplePercentage}%). AI answers are based on this sample only.
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            {worksheetContext.rowCount} rows, {worksheetContext.columns.length} columns (full dataset)
          </p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleFormSubmit} className="p-3 border-t border-border">
        {error && (
          <div className="mb-2 px-3 py-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-destructive/70 hover:text-destructive"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            disabled={isPending}
            className="flex-1 px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:border-foreground transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            className="p-2 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <IconSend size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}
