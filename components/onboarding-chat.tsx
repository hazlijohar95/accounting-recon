'use client'

import * as React from 'react'
import { useOnboardingState, useSetSelectedCompanyId } from '@/lib/store'
import {
  IconArrowUp,
  IconCheck,
  IconX,
  IconBuildings,
  IconSparkle,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { LogoAnimatedWithText } from '@/components/brand'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useAuth } from './auth-provider'
import { useOnboardingProgress, useSaveOnboardingProgress, useDeleteOnboardingProgress } from '@/lib/convex-hooks'
import { logConvexError, logManualError } from '@/lib/error-monitor'
import { ANIMATION_TIMINGS } from '@/constants/brand'

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
  const userId = user?.id?.toString()
  const savedProgress = useOnboardingProgress(userId)
  const saveProgress = useSaveOnboardingProgress()
  const deleteProgress = useDeleteOnboardingProgress()

  const currentQ = questions[step]

  // Load saved progress when opening onboarding
  React.useEffect(() => {
    if (showOnboarding && savedProgress && !savedProgress.isCompleted && !hasLoadedProgress) {
      setStep(savedProgress.currentStep)
      setOnboardingData(savedProgress.data as Record<string, string>)
      setHasLoadedProgress(true)

      const restoredMessages: Message[] = []
      // Restore messages for COMPLETED steps only (not current step)
      for (let i = 0; i < savedProgress.currentStep && i < questions.length; i++) {
        const q = questions[i]
        q.messages.forEach((msg, msgIdx) => {
          // Use unique ID: step index + message index + random suffix
          restoredMessages.push({ id: `bot-${i}-${msgIdx}-${Math.random().toString(36).slice(2)}`, content: msg, type: 'bot' })
        })
        const fieldValue = savedProgress.data[q.field as keyof typeof savedProgress.data]
        if (fieldValue) {
          restoredMessages.push({ id: `user-${i}-${Math.random().toString(36).slice(2)}`, content: fieldValue, type: 'user' })
        }
      }
      setMessages(restoredMessages)

      // Current step messages go to queue (will be displayed with typing animation)
      if (savedProgress.currentStep < questions.length) {
        setMessageQueue(questions[savedProgress.currentStep].messages)
      }
    }
  }, [showOnboarding, savedProgress, hasLoadedProgress, setOnboardingData])

  // Track if onboarding was completed in this session
  const [completedInSession, setCompletedInSession] = React.useState(false)

  // Reset on open (only if no saved progress and not just completed)
  React.useEffect(() => {
    if (showOnboarding && !savedProgress?.currentStep && !hasLoadedProgress && !completedInSession) {
      setStep(0)
      setMessages([])
      setInput('')
      setIsTyping(false)
      setShowInput(false)
      setMessageQueue(questions[0].messages)
    }
  }, [showOnboarding, savedProgress, hasLoadedProgress, completedInSession])

  // Process message queue with brand timings
  React.useEffect(() => {
    if (messageQueue.length === 0) {
      const timer = setTimeout(() => {
        setShowInput(true)
        inputRef.current?.focus()
      }, ANIMATION_TIMINGS.standard) // 300ms
      return () => clearTimeout(timer)
    }

    setIsTyping(true)
    setShowInput(false)

    // Use medium timing (500ms) for message delays
    const delay = messageQueue.length === questions[step]?.messages.length
      ? ANIMATION_TIMINGS.medium  // 500ms for first message
      : ANIMATION_TIMINGS.slow    // 800ms for subsequent

    const timer = setTimeout(() => {
      setIsTyping(false)
      const [next, ...rest] = messageQueue
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, content: next, type: 'bot' }])
      setMessageQueue(rest)
    }, delay)

    return () => clearTimeout(timer)
  }, [messageQueue, step])

  // Auto scroll with smooth behavior - also scroll when input/options appear
  React.useEffect(() => {
    const scrollEl = scrollRef.current
    if (scrollEl) {
      // Small delay to ensure DOM has rendered new content
      const timer = setTimeout(() => {
        scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [messages, isTyping, showInput])

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
    if (!isAuthenticated || !user) {
      console.error('[Onboarding] Not authenticated - cannot create company')
      setCreateError('Please sign in to create a company')
      setIsCreating(false)
      return
    }

    setIsCreating(true)
    setCreateError(null)

    // Prepare the workosUserId - prefer workosId, fallback to id
    const workosUserIdToSend = user.workosId ?? user.id

    console.log('[Onboarding] Creating company with data:', {
      name: data.companyName,
      userEmail: user.email,
      userName: user.name,
      userId: user.id,
      workosId: user.workosId,
      workosUserIdToSend,
      // Verify workosId is properly set
      hasWorkosId: Boolean(user.workosId),
      idsMatch: user.workosId === user.id,
    })

    try {
      const result = await createCompany({
        name: data.companyName || 'My Company',
        industryCategory: data.industryCategory,
        taxRegistered: data.taxRegistered === 'Yes',
        taxNumber: data.taxNumber,
        primaryBank: data.primaryBank,
        fiscalYearEnd: data.fiscalYearEnd,
        currency: 'MYR',
        userEmail: user.email,
        userName: user.name,
        workosUserId: workosUserIdToSend,
      })

      // The mutation returns { companyId, ownerId }
      const { companyId, ownerId } = result
      console.log('[Onboarding] Company created successfully:', {
        companyId,
        ownerId,
        // Log the ownerId type to verify it's a Convex ID (not WorkOS ID)
        ownerIdType: typeof ownerId,
        ownerIdPrefix: String(ownerId).substring(0, 10),
      })

      // VALIDATION: Check if ownerId looks like a WorkOS ID instead of Convex ID
      // WorkOS IDs start with "user_", Convex IDs are alphanumeric (like "jd7...")
      const ownerIdStr = String(ownerId)
      if (ownerIdStr.startsWith('user_')) {
        const errorMsg = `BUG: ownerId is a WorkOS ID (${ownerIdStr}), not a Convex ID!`
        console.error('[Onboarding]', errorMsg)
        logManualError(errorMsg, {
          companyId,
          ownerId,
          workosUserId: workosUserIdToSend,
          userEmail: user.email,
        })
      }

      console.log('[Onboarding] Setting selectedCompanyId in store:', companyId)
      setSelectedCompanyId(companyId)
      setCompletedInSession(true) // Prevent reset effect from firing

      if (userId) {
        deleteProgress(userId).catch((err) =>
          console.error('[Onboarding] Failed to delete onboarding progress:', err)
        )
      }

      console.log('[Onboarding] Calling onComplete callback')
      onComplete?.(companyId)
    } catch (error) {
      console.error('[Onboarding] Failed to create company:', error)
      // Track this error for monitoring
      logConvexError(error, 'companies:create', {
        companyName: data.companyName,
        workosUserId: workosUserIdToSend,
        userEmail: user.email,
      })
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
      }, ANIMATION_TIMINGS.standard) // 300ms
    }

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
    setCompletedInSession(false) // Reset for next time
    setHasLoadedProgress(false)
  }, [setShowOnboarding])

  if (!showOnboarding) return null

  const isLastStep = step === questions.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        style={{ animationDuration: `${ANIMATION_TIMINGS.medium}ms` }}
        onClick={handleClose}
      />

      {/* Modal - Fixed height container to prevent layout shifts */}
      <div
        className="relative w-full max-w-md bg-background border border-border shadow-2xl flex flex-col h-[520px] overflow-hidden animate-fade-in-up"
        style={{ animationDuration: `${ANIMATION_TIMINGS.medium}ms` }}
      >
        {/* Header - Fixed 48px */}
        <div className="flex items-center justify-between px-4 h-12 min-h-12 border-b border-border">
          <LogoAnimatedWithText size={20} animate={false} />
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-secondary transition-colors"
            style={{ transitionDuration: `${ANIMATION_TIMINGS.fast}ms` }}
          >
            <IconX size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Progress indicator - Fixed 28px, square segments */}
        <div className="px-4 py-2 h-7 min-h-7 border-b border-border/50">
          <div className="flex gap-0.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 transition-all',
                  i < step ? 'bg-foreground' :
                  i === step ? 'bg-foreground/60' : 'bg-border'
                )}
                style={{ transitionDuration: `${ANIMATION_TIMINGS.medium}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Messages - Flexible height, scrollable */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin">
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
                  'px-4 py-2.5 text-sm max-w-[85%] animate-fade-in-up',
                  msg.type === 'bot'
                    ? 'bg-secondary text-foreground rounded-sm'
                    : 'bg-foreground text-background rounded-sm'
                )}
                style={{ animationDuration: `${ANIMATION_TIMINGS.standard}ms` }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator - Using brand's calm-typing animation */}
          {isTyping && (
            <div
              className="flex justify-start animate-fade-in"
              style={{ animationDuration: `${ANIMATION_TIMINGS.standard}ms` }}
            >
              <div className="bg-secondary rounded-sm px-4 py-3 flex items-center gap-2">
                <IconSparkle size={14} className="text-muted-foreground assistant-icon-cell" />
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full assistant-typing-dot" />
                  <span
                    className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full assistant-typing-dot"
                    style={{ animationDelay: '200ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full assistant-typing-dot"
                    style={{ animationDelay: '400ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Option buttons - Grid layout for consistency, larger touch targets */}
          {showInput && currentQ?.inputType === 'select' && currentQ.options && (
            <div
              className="grid grid-cols-2 gap-2 pt-2 animate-fade-in"
              style={{ animationDuration: `${ANIMATION_TIMINGS.standard}ms` }}
            >
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => advance(opt)}
                  className="h-12 px-4 text-sm font-medium border border-border hover:bg-secondary hover:border-foreground/20 transition-all active:scale-[0.98]"
                  style={{ transitionDuration: `${ANIMATION_TIMINGS.fast}ms` }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Yes/No buttons - Larger touch targets */}
          {showInput && currentQ?.inputType === 'yesno' && (
            <div
              className="grid grid-cols-2 gap-3 pt-2 animate-fade-in"
              style={{ animationDuration: `${ANIMATION_TIMINGS.standard}ms` }}
            >
              <button
                onClick={() => advance('Yes')}
                className="h-12 px-4 text-sm font-medium border border-border hover:bg-secondary hover:border-foreground/20 transition-all active:scale-[0.98]"
                style={{ transitionDuration: `${ANIMATION_TIMINGS.fast}ms` }}
              >
                Yes
              </button>
              <button
                onClick={() => advance('No')}
                className="h-12 px-4 text-sm font-medium border border-border hover:bg-secondary hover:border-foreground/20 transition-all active:scale-[0.98]"
                style={{ transitionDuration: `${ANIMATION_TIMINGS.fast}ms` }}
              >
                No
              </button>
            </div>
          )}
        </div>

        {/* Input area - Fixed 72px container, always present to prevent layout shift */}
        <div className="h-[72px] min-h-[72px] p-3 border-t border-border">
          {showInput ? (
            currentQ?.inputType === 'text' ? (
              <div
                className="flex gap-2 h-full animate-fade-in"
                style={{ animationDuration: `${ANIMATION_TIMINGS.standard}ms` }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={currentQ.placeholder}
                  className="flex-1 bg-secondary border border-border px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-colors"
                  style={{ transitionDuration: `${ANIMATION_TIMINGS.fast}ms` }}
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={cn(
                    'px-4 transition-all active:scale-[0.98]',
                    input.trim()
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
                  )}
                  style={{ transitionDuration: `${ANIMATION_TIMINGS.fast}ms` }}
                >
                  <IconArrowUp size={16} />
                </button>
              </div>
            ) : currentQ?.inputType === 'none' ? (
              <div
                className="h-full animate-fade-in"
                style={{ animationDuration: `${ANIMATION_TIMINGS.standard}ms` }}
              >
                <button
                  onClick={isLastStep ? handleClose : handleSubmit}
                  disabled={isCreating}
                  className="w-full h-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ transitionDuration: `${ANIMATION_TIMINGS.fast}ms` }}
                >
                  {isCreating ? (
                    <>
                      <IconBuildings size={16} className="assistant-icon-cell" />
                      Setting up...
                    </>
                  ) : isLastStep ? (
                    <>
                      <IconCheck size={16} />
                      Get Started
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
                {createError && (
                  <p
                    className="mt-2 text-sm text-destructive text-center animate-fade-in"
                    style={{ animationDuration: `${ANIMATION_TIMINGS.standard}ms` }}
                  >
                    {createError}
                  </p>
                )}
              </div>
            ) : null
          ) : (
            // Empty placeholder to maintain height when input is hidden
            <div className="h-full" />
          )}
        </div>
      </div>
    </div>
  )
}
