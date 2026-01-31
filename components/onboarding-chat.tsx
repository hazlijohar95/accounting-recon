'use client'

import * as React from 'react'
import { useOnboardingState, useSetSelectedCompanyId } from '@/lib/store'
import { ArrowUp, Check, X, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoAnimatedWithText } from '@/components/brand'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useAuth } from './auth-provider'
import { useOnboardingProgress, useSaveOnboardingProgress, useDeleteOnboardingProgress } from '@/lib/convex-hooks'

interface Question {
  id: string
  messages: string[]
  inputType: 'text' | 'select' | 'yesno' | 'none'
  placeholder?: string
  options?: string[]
  field: string
  skipIf?: (data: Record<string, string>) => boolean
}

const questions: Question[] = [
  {
    id: 'welcome',
    messages: ['Welcome to Reconcile', "Let's set up your company profile"],
    inputType: 'none',
    field: 'started',
  },
  {
    id: 'company',
    messages: ["What's your company name?"],
    placeholder: 'e.g., Acme Sdn Bhd',
    inputType: 'text',
    field: 'companyName',
  },
  {
    id: 'industry',
    messages: ['What industry are you in?'],
    inputType: 'select',
    options: ['F&B', 'Retail', 'Services', 'Manufacturing', 'Tech', 'Other'],
    field: 'industryCategory',
  },
  {
    id: 'taxRegistered',
    messages: ['Are you registered for SST/tax?'],
    inputType: 'yesno',
    field: 'taxRegistered',
  },
  {
    id: 'taxNumber',
    messages: ["What's your tax registration number?"],
    placeholder: 'e.g., C12345678901',
    inputType: 'text',
    field: 'taxNumber',
    skipIf: (data) => data.taxRegistered !== 'Yes',
  },
  {
    id: 'bank',
    messages: ['Which bank do you primarily use?'],
    inputType: 'select',
    options: ['Maybank', 'CIMB', 'Public Bank', 'RHB', 'Hong Leong', 'Other'],
    field: 'primaryBank',
  },
  {
    id: 'fiscalYear',
    messages: ['When does your financial year end?'],
    inputType: 'select',
    options: ['December', 'March', 'June', 'September', 'Other'],
    field: 'fiscalYearEnd',
  },
  {
    id: 'complete',
    messages: ["You're all set!", 'Your company profile has been created'],
    inputType: 'none',
    field: 'complete',
  },
]

interface Message {
  id: string
  content: string
  type: 'bot' | 'user'
}

interface OnboardingChatProps {
  onComplete?: (companyId: Id<'companies'>) => void
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const { user, isAuthenticated } = useAuth()
  const { showOnboarding, setShowOnboarding, setOnboardingData, onboardingData } = useOnboardingState()
  const setSelectedCompanyId = useSetSelectedCompanyId()
  const [step, setStep] = React.useState(0)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState('')
  const [isTyping, setIsTyping] = React.useState(false)
  const [messageQueue, setMessageQueue] = React.useState<string[]>([])
  const [showInput, setShowInput] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)
  const [hasLoadedProgress, setHasLoadedProgress] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const createCompany = useMutation(api.companies.create)

  // Onboarding progress persistence hooks
  // Only use stable user.id (not email) to avoid data consistency issues
  // Progress is only persisted for authenticated users
  const userId = user?.id?.toString()
  const savedProgress = useOnboardingProgress(userId)
  const saveProgress = useSaveOnboardingProgress()
  const deleteProgress = useDeleteOnboardingProgress()

  const currentQ = questions[step]

  // Load saved progress when opening onboarding
  React.useEffect(() => {
    if (showOnboarding && savedProgress && !savedProgress.isCompleted && !hasLoadedProgress) {
      // Restore saved progress
      setStep(savedProgress.currentStep)
      setOnboardingData(savedProgress.data as Record<string, string>)
      setHasLoadedProgress(true)

      // Rebuild messages for restored progress
      const restoredMessages: Message[] = []
      for (let i = 0; i <= savedProgress.currentStep && i < questions.length; i++) {
        const q = questions[i]
        // Add bot messages for each completed step
        q.messages.forEach((msg) => {
          restoredMessages.push({ id: `bot-${i}-${Date.now()}`, content: msg, type: 'bot' })
        })
        // Add user response if we have data for this step
        const fieldValue = savedProgress.data[q.field as keyof typeof savedProgress.data]
        if (fieldValue) {
          restoredMessages.push({ id: `user-${i}-${Date.now()}`, content: fieldValue, type: 'user' })
        }
      }
      setMessages(restoredMessages)

      // Start from current step's messages if not at last message
      if (savedProgress.currentStep < questions.length) {
        setMessageQueue(questions[savedProgress.currentStep].messages)
      }
    }
  }, [showOnboarding, savedProgress, hasLoadedProgress, setOnboardingData])

  // Reset on open (only if no saved progress)
  React.useEffect(() => {
    if (showOnboarding && !savedProgress?.currentStep) {
      setStep(0)
      setMessages([])
      setInput('')
      setIsTyping(false)
      setShowInput(false)
      setMessageQueue(questions[0].messages)
      setHasLoadedProgress(false)
    }
  }, [showOnboarding, savedProgress])

  // Process message queue with calmer timing
  React.useEffect(() => {
    if (messageQueue.length === 0) {
      // Done with messages, show input with smooth delay
      const timer = setTimeout(() => {
        setShowInput(true)
        inputRef.current?.focus()
      }, 400)
      return () => clearTimeout(timer)
    }

    setIsTyping(true)
    setShowInput(false)

    // Calmer delays - slower for first message, consistent for subsequent
    const delay = messageQueue.length === questions[step]?.messages.length ? 600 : 800

    const timer = setTimeout(() => {
      setIsTyping(false)
      const [next, ...rest] = messageQueue
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, content: next, type: 'bot' }])
      setMessageQueue(rest)
    }, delay)

    return () => clearTimeout(timer)
  }, [messageQueue, step])

  // Auto scroll with smooth behavior
  React.useEffect(() => {
    const scrollEl = scrollRef.current
    if (scrollEl) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const findNextStep = React.useCallback((currentStep: number, data: Record<string, string>): number => {
    let nextStep = currentStep + 1
    while (nextStep < questions.length) {
      const q = questions[nextStep]
      if (q.skipIf && q.skipIf(data)) {
        nextStep++
      } else {
        break
      }
    }
    return nextStep
  }, [])

  const handleCreateCompany = React.useCallback(async (data: Record<string, string>) => {
    // Skip company creation if not authenticated (demo mode)
    if (!isAuthenticated || !user) {
      console.log('Not authenticated, skipping company creation (demo mode)')
      return
    }

    setIsCreating(true)
    setCreateError(null)
    try {
      const companyId = await createCompany({
        name: data.companyName || 'My Company',
        industryCategory: data.industryCategory,
        taxRegistered: data.taxRegistered === 'Yes',
        taxNumber: data.taxNumber,
        primaryBank: data.primaryBank,
        fiscalYearEnd: data.fiscalYearEnd,
        currency: 'MYR',
        // ownerId is derived from auth context on backend
      })
      // Set the newly created company as selected
      setSelectedCompanyId(companyId)

      // Clean up saved onboarding progress (no longer needed)
      if (userId) {
        deleteProgress(userId).catch((err) =>
          console.error('Failed to delete onboarding progress:', err)
        )
      }

      onComplete?.(companyId)
    } catch (error) {
      console.error('Failed to create company:', error)
      setCreateError(error instanceof Error ? error.message : 'Failed to create company. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }, [isAuthenticated, user, createCompany, setSelectedCompanyId, onComplete, userId, deleteProgress])

  const advance = React.useCallback((value?: string) => {
    const newData = value ? { ...onboardingData, [currentQ.field]: value } : onboardingData

    if (value) {
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, content: value, type: 'user' }])
      setOnboardingData({ [currentQ.field]: value })
    }
    setInput('')
    setShowInput(false)

    const nextStep = findNextStep(step, newData)

    if (nextStep < questions.length) {
      setStep(nextStep)
      setTimeout(() => {
        setMessageQueue(questions[nextStep].messages)
      }, 400)
    }

    // Save progress to backend (persists across browser close)
    if (userId) {
      saveProgress({
        userId,
        currentStep: nextStep,
        data: {
          companyName: newData.companyName,
          industryCategory: newData.industryCategory,
          taxRegistered: newData.taxRegistered,
          taxNumber: newData.taxNumber,
          primaryBank: newData.primaryBank,
          fiscalYearEnd: newData.fiscalYearEnd,
        },
        isCompleted: nextStep >= questions.length - 1,
      }).catch((err) => console.error('Failed to save onboarding progress:', err))
    }

    // If this was the second-to-last step, create the company
    if (nextStep === questions.length - 1) {
      handleCreateCompany(newData)
    }
  }, [currentQ?.field, step, onboardingData, setOnboardingData, findNextStep, handleCreateCompany, userId, saveProgress])

  const handleSubmit = React.useCallback(() => {
    if (currentQ.inputType === 'none') {
      advance()
    } else if (currentQ.inputType === 'text' && input.trim()) {
      advance(input.trim())
    }
  }, [currentQ?.inputType, input, advance])

  const handleClose = React.useCallback(() => {
    setShowOnboarding(false)
  }, [setShowOnboarding])

  if (!showOnboarding) return null

  const isLastStep = step === questions.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - calmer fade */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500"
        onClick={handleClose}
      />

      {/* Modal - smoother entry */}
      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[600px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <LogoAnimatedWithText size={20} animate={false} />
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors duration-200"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-4 py-2 border-b border-border/50">
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-500 ease-out',
                  i < step ? 'bg-foreground' : i === step ? 'bg-foreground/50' : 'bg-secondary'
                )}
              />
            ))}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'px-4 py-2.5 text-sm max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out',
                  msg.type === 'bot'
                    ? 'bg-secondary text-foreground rounded-2xl rounded-bl-md'
                    : 'bg-foreground text-background rounded-2xl rounded-br-md'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator - calmer animation */}
          {isTyping && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse"
                    style={{ animationDuration: '1s' }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse"
                    style={{ animationDuration: '1s', animationDelay: '200ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse"
                    style={{ animationDuration: '1s', animationDelay: '400ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Option buttons - calmer animation */}
          {showInput && currentQ?.inputType === 'select' && currentQ.options && (
            <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-400 ease-out">
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => advance(opt)}
                  className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary hover:border-muted-foreground/30 transition-all duration-200 active:scale-[0.98]"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Yes/No buttons */}
          {showInput && currentQ?.inputType === 'yesno' && (
            <div className="flex gap-3 pt-2 animate-in fade-in duration-400 ease-out">
              <button
                onClick={() => advance('Yes')}
                className="flex-1 px-4 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary hover:border-muted-foreground/30 transition-all duration-200 active:scale-[0.98]"
              >
                Yes
              </button>
              <button
                onClick={() => advance('No')}
                className="flex-1 px-4 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary hover:border-muted-foreground/30 transition-all duration-200 active:scale-[0.98]"
              >
                No
              </button>
            </div>
          )}
        </div>

        {/* Input area */}
        {showInput && (
          <div className="p-3 border-t border-border animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            {currentQ?.inputType === 'text' ? (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={currentQ.placeholder}
                  className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground/50 transition-colors duration-200"
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={cn(
                    'px-4 rounded-xl transition-all duration-200 active:scale-[0.98]',
                    input.trim()
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            ) : currentQ?.inputType === 'none' ? (
              <>
                <button
                  onClick={isLastStep ? handleClose : handleSubmit}
                  disabled={isCreating}
                  className="w-full bg-foreground text-background py-3 rounded-xl text-sm font-medium hover:bg-foreground/90 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Building2 className="w-4 h-4 animate-pulse" />
                      Setting up...
                    </>
                  ) : isLastStep ? (
                    <>
                      <Check className="w-4 h-4" />
                      Get Started
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
                {createError && (
                  <p className="mt-2 text-sm text-red-500 text-center animate-in fade-in duration-300">
                    {createError}
                  </p>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
