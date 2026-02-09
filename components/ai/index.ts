// AI Components for Reconciled
// These components integrate with the Vercel AI SDK for chat, streaming, and tool use

export { ChatMessage, TypingIndicator, MatchResultCard, AnalysisMessage } from './chat-message'
export type { MatchResult } from './chat-message'
export { AssistantPanel } from './assistant-panel'
export { AssistantActionButtons, CreateMatchButton } from './assistant-action-buttons'
export { OnboardingChatAI } from './onboarding-chat-ai'

// Agentic reconciliation assistant (multi-step tool use, client-side confirmation)
export { ReconcileAgent } from './reconcile-agent'

// Note: AssistantPanel is kept for backwards compatibility (e.g., other pages)
// ReconcileAgent is the primary assistant for the reconcile page
// ReconcileAssistant (legacy single-turn) has been removed
