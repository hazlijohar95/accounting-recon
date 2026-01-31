// AI Components for Reconciled
// These components integrate with the Vercel AI SDK for chat, streaming, and tool use

export { ChatMessage, TypingIndicator, MatchResultCard, AnalysisMessage } from './chat-message'
export type { MatchResult } from './chat-message'
export { AssistantPanel } from './assistant-panel'
export { ReconcileAssistant } from './reconcile-assistant'
export { AssistantActionButtons, CreateMatchButton } from './assistant-action-buttons'
export { OnboardingChatAI } from './onboarding-chat-ai'

// Note: AssistantPanel is kept for backwards compatibility (e.g., other pages)
// ReconcileAssistant is the new branded component for the reconcile page
