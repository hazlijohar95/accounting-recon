'use client'

import { useState, useCallback } from 'react'

interface UseCopyToClipboardOptions {
  /** Duration in ms before resetting copied state. Default: 2000 */
  resetDelay?: number
}

interface UseCopyToClipboardReturn {
  /** Whether content was recently copied */
  copied: boolean
  /** Copy text to clipboard */
  copy: (text: string) => Promise<void>
  /** Reset copied state manually */
  reset: () => void
}

/**
 * Hook for copying text to clipboard with automatic state reset.
 *
 * @example
 * const { copied, copy } = useCopyToClipboard()
 *
 * <button onClick={() => copy(text)}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { resetDelay = 2000 } = options
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), resetDelay)
  }, [resetDelay])

  const reset = useCallback(() => {
    setCopied(false)
  }, [])

  return { copied, copy, reset }
}
