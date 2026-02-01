export { LogoMark, LogoFull, LogoStacked } from './logo-mark'
// Note: Icons are now exported from './icons' (pixel icon system)
// Legacy geometric-icons.tsx kept for reference but no longer exported
export { LogoAnimated, LogoAnimatedWithText } from './logo-animated'
export { LoadingSpinner, LoadingDots } from './loading-spinner'
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonTable,
} from './skeleton'
export { PageTransition, PageTransitionOverlay } from './page-transition'
export { SuccessAnimation, SuccessCheckmark } from './success-animation'
export { ErrorAnimation, ErrorX } from './error-animation'
export {
  ConfidenceGauge,
  ConfidenceBar,
  ConfidenceThresholds,
} from './confidence-gauge'
export {
  AIMatchingPipeline,
  AIMatchingPipelineCompact,
  MatchingStepIndicator,
} from './ai-matching-pipeline'
export {
  TransactionMatchAnimation,
  ReconciliationProgress,
  DataSyncPulse,
  MatchCelebration,
} from './match-animation'
export { BrandedEmptyState } from './branded-empty-state'
export { BrandedErrorState, BrandedErrorStateCompact } from './branded-error-state'
export {
  MatchLayerBadge,
  getMatchLayerLabel,
  getMatchLayerShortLabel,
} from './match-layer-badge'
export type { MatchLayer } from './match-layer-badge'
export { ManualMatchModal } from './manual-match-modal'
export { TruncatedText, AmountWithTooltip } from './truncated-text'
export {
  PremiumButton,
  ButtonPrimary,
  ButtonSecondary,
  ButtonDanger,
  ButtonGhost,
  IconButton,
} from './premium-button'
export {
  StatCard,
  StatCardMini,
  IconCashIn,
  IconCashOut,
  IconMatched,
  IconSuspense,
} from './stat-card'
export { CashFlowChart, CashFlowLegend } from './cash-flow-chart'
export type { CashFlowDataPoint } from './cash-flow-chart'
export {
  ExpenseChart,
  ExpenseChartCompact,
  TopExpensesList,
} from './expense-chart'
export type { ExpenseCategory, TopExpense } from './expense-chart'
export { ChartSection, SectionHeader } from './chart-section'

// 3D Components
export {
  Logo3DBase,
  Logo3DHero,
  Logo3DLoading,
  Logo3DMarketing,
  Logo3DShowcase,
  LogoLighting,
  useThemeColor,
  LOGO_RECTANGLES,
} from './3d'
export type {
  Logo3DBaseProps,
  Logo3DHeroProps,
  Logo3DLoadingProps,
  Logo3DMarketingProps,
  Logo3DShowcaseProps,
  LogoRectangle,
} from './3d'

// Brand Icon System (Phosphor icons with geometric styling)
export * from './icons'
