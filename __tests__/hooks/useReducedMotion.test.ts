import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

describe('useReducedMotion', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns false by default (no reduced motion preference)', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when user prefers reduced motion', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: true, // User prefers reduced motion
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('uses correct media query', () => {
    renderHook(() => useReducedMotion())

    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('adds event listener on mount', () => {
    const addEventListenerMock = vi.fn()
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: addEventListenerMock,
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    renderHook(() => useReducedMotion())

    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('removes event listener on unmount', () => {
    const removeEventListenerMock = vi.fn()
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }))

    const { unmount } = renderHook(() => useReducedMotion())
    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('updates when user changes preference', async () => {
    let changeHandler: ((e: { matches: boolean }) => void) | null = null

    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false, // Start with no preference
      media: query,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    // Simulate user enabling reduced motion
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true })
      }
    })

    expect(result.current).toBe(true)
  })

  it('updates when user disables reduced motion', async () => {
    let changeHandler: ((e: { matches: boolean }) => void) | null = null

    mockMatchMedia.mockImplementation((query: string) => ({
      matches: true, // Start with reduced motion enabled
      media: query,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)

    // Simulate user disabling reduced motion
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: false })
      }
    })

    expect(result.current).toBe(false)
  })
})
