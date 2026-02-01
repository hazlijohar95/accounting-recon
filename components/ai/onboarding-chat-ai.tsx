'use client'

import * as React from 'react'
import { useChat, UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useOnboardingState, useSetSelectedCompanyId } from '@/lib/store'
import { IconX, IconSend, IconBuildings, IconLoader, IconSparkle, IconCheckCircle } from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { LogoAnimatedWithText } from '@/components/brand'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useAuth } from '../auth-provider'
import { ChatMessage, TypingIndicator } from './chat-message'

interface OnboardingChatAIProps {
  onComplete?: (companyId: Id<'companies'>) => void
}

// Helper to extract text content from message parts
function getMessageText(message: UIMessage): string {
  return message.parts
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
}

export function OnboardingChatAI({ onComplete }: OnboardingChatAIProps) {
  const { user, isAuthenticated } = useAuth()
  const { showOnboarding, setShowOnboarding, setOnboardingData } = useOnboardingState()
  const setSelectedCompanyId = useSetSelectedCompanyId()
  const [isCreatingCompany, setIsCreatingCompany] = React.useState(false)
  const [isComplete, setIsComplete] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const createCompany = useMutation(api.companies.create)

  const { messages, sendMessage, setMessages } = useChat({
    id: 'onboarding-chat',
    transport: new DefaultChatTransport({
      api: '/api/chat/onboard',
    }),
  })

  // Handle company creation from tool calls
  const handleCreateCompany = React.useCallback(async (args: {
    companyName: string
    industryCategory: string
    taxRegistered: boolean
    taxNumber?: string
    primaryBank: string
    fiscalYearEnd: string
  }) => {
    if (isCreatingCompany) return

    setOnboardingData({
      companyName: args.companyName,
      industryCategory: args.industryCategory,
      taxRegistered: args.taxRegistered ? 'Yes' : 'No',
      taxNumber: args.taxNumber || '',
      primaryBank: args.primaryBank,
      fiscalYearEnd: args.fiscalYearEnd,
    })

    if (isAuthenticated && user) {
      setIsCreatingCompany(true)
      try {
        const { companyId } = await createCompany({
          name: args.companyName,
          industryCategory: args.industryCategory,
          taxRegistered: args.taxRegistered,
          taxNumber: args.taxNumber,
          primaryBank: args.primaryBank,
          fiscalYearEnd: args.fiscalYearEnd,
          currency: 'MYR',
          // ownerId is derived from auth context on backend
        })
        setSelectedCompanyId(companyId)
        setIsComplete(true)
        onComplete?.(companyId)

        setTimeout(() => {
          setShowOnboarding(false)
        }, 3000)
      } catch (error) {
        console.error('Failed to create company:', error)
      } finally {
        setIsCreatingCompany(false)
      }
    } else {
      setIsComplete(true)
      setTimeout(() => {
        setShowOnboarding(false)
      }, 3000)
    }
  }, [isCreatingCompany, isAuthenticated, user, createCompany, setSelectedCompanyId, setOnboardingData, onComplete, setShowOnboarding])

  // Process tool calls from messages
  React.useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return

    for (const part of lastMessage.parts) {
      if (part.type.startsWith('tool-') && 'state' in part && part.state === 'done') {
        const toolPart = part as { state: string; output?: unknown }
        if (toolPart.output && typeof toolPart.output === 'object') {
          const output = toolPart.output as { profile?: unknown }
          if (output.profile) {
            const args = output.profile as {
              companyName: string
              industryCategory: string
              taxRegistered: boolean
              taxNumber?: string
              primaryBank: string
              fiscalYearEnd: string
            }
            handleCreateCompany(args)
          }
        }
      }
    }
  }, [messages, handleCreateCompany])

  // Initialize with welcome message
  React.useEffect(() => {
    if (showOnboarding && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          parts: [{
            type: 'text',
            text: "Welcome to Reconciled! I'm here to help you set up your company profile.\n\nLet's start with the basics — what's your company name?",
          }],
        } as UIMessage,
      ])
      setIsComplete(false)
    }
  }, [showOnboarding, messages.length, setMessages])

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isPending])

  // Focus input when opened
  React.useEffect(() => {
    if (showOnboarding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showOnboarding])

  const handleClose = React.useCallback(() => {
    setShowOnboarding(false)
  }, [setShowOnboarding])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isPending || isCreatingCompany) return

    setIsPending(true)
    const messageText = input.trim()
    setInput('')

    try {
      await sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: messageText }],
      })
    } finally {
      setIsPending(false)
    }
  }

  if (!showOnboarding) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-500"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200/60 dark:border-slate-700/50 rounded-3xl shadow-2xl flex flex-col max-h-[700px] overflow-hidden animate-in fade-in-0 slide-in-from-bottom-6 zoom-in-95 duration-500 ease-out">
        {/* Decorative gradient border */}
        <div className="absolute inset-0 rounded-3xl p-px bg-gradient-to-b from-amber-500/30 via-transparent to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-500/5" />
          <div className="relative">
            <LogoAnimatedWithText size={22} animate={false} />
          </div>
          <button
            onClick={handleClose}
            className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-200"
          >
            <IconX size={20} className="text-slate-500" />
          </button>
        </div>

        {/* AI Badge */}
        <div className="relative px-6 py-3 border-b border-slate-200/40 dark:border-slate-700/30 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/30">
                <IconSparkle size={14} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wide">
                AI Onboarding
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Powered by Claude
            </span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.03) 0%, transparent 50%)',
          }}
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as 'user' | 'assistant'}
              content={getMessageText(msg)}
            />
          ))}
          {isPending && <TypingIndicator />}

          {/* Creating company indicator */}
          {isCreatingCompany && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <IconBuildings size={20} className="text-white animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Creating your company profile...
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  This will only take a moment
                </p>
              </div>
            </div>
          )}

          {/* Success message */}
          {isComplete && !isCreatingCompany && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <IconCheckCircle size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  You&apos;re all set!
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Your company profile has been created
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your response..."
                className={cn(
                  'w-full px-4 py-3.5',
                  'text-sm text-slate-800 dark:text-white',
                  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                  'bg-white dark:bg-slate-800/50',
                  'border border-slate-200/80 dark:border-slate-700/50',
                  'rounded-xl',
                  'shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                disabled={isPending || isCreatingCompany || isComplete}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isPending || isCreatingCompany || isComplete}
              className={cn(
                'flex-shrink-0 w-12 h-12 rounded-xl',
                'flex items-center justify-center',
                'transition-all duration-300',
                input.trim() && !isPending && !isCreatingCompany && !isComplete
                  ? [
                      'bg-gradient-to-r from-amber-500 to-orange-500',
                      'text-white',
                      'shadow-lg shadow-amber-500/30',
                      'hover:shadow-xl hover:shadow-amber-500/40',
                      'hover:scale-105',
                      'active:scale-95',
                    ]
                  : [
                      'bg-slate-100 dark:bg-slate-800',
                      'text-slate-400',
                      'cursor-not-allowed',
                    ]
              )}
            >
              {isPending ? (
                <IconLoader size={20} className="animate-spin" />
              ) : (
                <IconSend size={20} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
