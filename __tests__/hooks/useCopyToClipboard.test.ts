import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns initial state with copied as false', () => {
    const { result } = renderHook(() => useCopyToClipboard())

    expect(result.current.copied).toBe(false)
    expect(typeof result.current.copy).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('copies text to clipboard', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  it('sets copied to true after copying', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(true)
  })

  it('resets copied state after default delay (2000ms)', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(true)

    // Advance timers by 2000ms
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.copied).toBe(false)
  })

  it('respects custom resetDelay option', async () => {
    const { result } = renderHook(() => useCopyToClipboard({ resetDelay: 5000 }))

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(true)

    // Advance by 2000ms - should still be copied
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.copied).toBe(true)

    // Advance by another 3000ms (total 5000ms) - should reset
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.copied).toBe(false)
  })

  it('reset function manually resets copied state', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('test text')
    })

    expect(result.current.copied).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.copied).toBe(false)
  })

  it('can copy multiple times', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('first')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('first')

    await act(async () => {
      await result.current.copy('second')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('second')
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)
  })

  it('copy function is memoized', () => {
    const { result, rerender } = renderHook(() => useCopyToClipboard())

    const firstCopyRef = result.current.copy

    rerender()

    expect(result.current.copy).toBe(firstCopyRef)
  })

  it('reset function is memoized', () => {
    const { result, rerender } = renderHook(() => useCopyToClipboard())

    const firstResetRef = result.current.reset

    rerender()

    expect(result.current.reset).toBe(firstResetRef)
  })
})
