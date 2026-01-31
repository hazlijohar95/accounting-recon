import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useIsMobile } from '@/hooks/useIsMobile'

describe('useIsMobile', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>
  let mediaQueryListeners: Map<string, (e: MediaQueryListEvent) => void>

  beforeEach(() => {
    mediaQueryListeners = new Map()

    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.set(query, listener)
        }
      }),
      removeEventListener: vi.fn((event: string) => {
        if (event === 'change') {
          mediaQueryListeners.delete(query)
        }
      }),
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mediaQueryListeners.clear()
  })

  it('returns false by default (desktop)', () => {
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true on mobile viewport', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: true, // Mobile viewport
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('uses correct breakpoint (767px)', () => {
    renderHook(() => useIsMobile())

    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)')
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

    renderHook(() => useIsMobile())

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

    const { unmount } = renderHook(() => useIsMobile())
    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('updates when viewport changes from desktop to mobile', async () => {
    let changeHandler: ((e: { matches: boolean }) => void) | null = null

    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate viewport change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true })
      }
    })

    expect(result.current).toBe(true)
  })

  it('updates when viewport changes from mobile to desktop', async () => {
    let changeHandler: ((e: { matches: boolean }) => void) | null = null

    mockMatchMedia.mockImplementation((query: string) => ({
      matches: true, // Start as mobile
      media: query,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    // Simulate viewport change to desktop
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: false })
      }
    })

    expect(result.current).toBe(false)
  })
})
