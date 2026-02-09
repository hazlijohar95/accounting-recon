'use client'

/**
 * Error Suppressor Component
 *
 * Suppresses known non-critical errors from third-party libraries
 * (like Univer.js) that pollute the console but don't affect functionality.
 *
 * This runs at module load time (before React renders) to catch errors early.
 */

const SUPPRESSED_ERROR_PATTERNS = [
  // Univer.js internal errors — narrowed to specific lifecycle messages
  /SelectionRenderService/i,
  /should not receive null/i,
  /getSelectionDataWithStyle/i, // Specific Univer method
  /ComponentWithInjector/i, // @wendellhu/redi DI container

  // Univer-specific null access errors (scoped to Univer method names)
  /Cannot read properties of (?:undefined|null) \(reading '(?:getSheets|getActiveSheet|getWorkbook|getWorksheet|getCommandService|getUniverInstanceService)'\)/i,

  // Errors originating from @univerjs packages (scoped to package paths)
  /@univerjs\//i, // Only match package path, not arbitrary "univerjs" text
  /@wendellhu\/redi/i, // Univer dependency injection framework

  // Univer sheets plugin errors (scoped to package names)
  /@univerjs\/sheets-ui/i,
  /@univerjs\/sheets-formula/i,

  // React lifecycle errors from third-party libraries during teardown
  /Can't perform a React state update on a component that hasn't mounted/i,
  /Can't perform a React state update on an unmounted component/i,
]

/**
 * Extract error message from various error formats
 */
function extractMessage(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return arg.message || ''
  if (arg && typeof arg === 'object') {
    const obj = arg as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.reason === 'string') return obj.reason
    // Try to stringify for inspection
    try {
      return JSON.stringify(arg)
    } catch {
      return ''
    }
  }
  return String(arg || '')
}

function shouldSuppressError(message: string | undefined | null): boolean {
  if (!message) return false
  return SUPPRESSED_ERROR_PATTERNS.some(p => p.test(message))
}

/**
 * Check if any argument in a console call should trigger suppression
 */
function shouldSuppressConsoleArgs(args: unknown[]): boolean {
  for (const arg of args) {
    const message = extractMessage(arg)
    if (shouldSuppressError(message)) return true
  }
  return false
}

// Set up error suppression immediately when this module loads
if (typeof window !== 'undefined') {
  // Store originals only once (in case this runs multiple times)
  const hasPatched = (window as { __errorSuppressorPatched?: boolean }).__errorSuppressorPatched

  if (!hasPatched) {
    (window as { __errorSuppressorPatched?: boolean }).__errorSuppressorPatched = true

    // Patch console methods
    const originalError = console.error
    const originalWarn = console.warn

    console.error = (...args: unknown[]) => {
      if (shouldSuppressConsoleArgs(args)) return
      originalError.apply(console, args)
    }

    console.warn = (...args: unknown[]) => {
      if (shouldSuppressConsoleArgs(args)) return
      originalWarn.apply(console, args)
    }

    // Catch runtime errors (capture phase for early interception)
    window.addEventListener('error', (event) => {
      const message = event.message || event.error?.message || extractMessage(event.error) || ''
      if (shouldSuppressError(message)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return false
      }
    }, true)

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || extractMessage(event.reason) || ''
      if (shouldSuppressError(message)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }, true)
  }
}

/**
 * Empty component - the error suppression happens at module load time.
 * Render this component to ensure the module is included in the bundle.
 */
export function ErrorSuppressor() {
  return null
}
