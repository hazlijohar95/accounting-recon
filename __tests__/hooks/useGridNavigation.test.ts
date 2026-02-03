import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGridNavigation, GridNavigationOptions } from '@/hooks/useGridNavigation'

describe('useGridNavigation', () => {
  const defaultOptions: GridNavigationOptions = {
    rowCount: 5,
    colCount: 4,
    onEditStart: vi.fn(),
    onEditConfirm: vi.fn(),
    onEditCancel: vi.fn(),
    onClearCell: vi.fn(),
    onAddRow: vi.fn(),
    isEditing: false,
    editingPosition: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Arrow key navigation', () => {
    it('moves focus down on ArrowDown', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      // First set an initial focus
      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 1 })
      })

      // Simulate ArrowDown
      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, colIndex: 1 })
    })

    it('moves focus up on ArrowUp', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 2, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 1 })
    })

    it('moves focus left on ArrowLeft', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 2 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 1 })
    })

    it('moves focus right on ArrowRight', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 2 })
    })

    it('clamps to grid bounds when moving up from first row', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 0, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, colIndex: 1 })
    })

    it('clamps to grid bounds when moving down from last row', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 4, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 4, colIndex: 1 })
    })

    it('clamps to grid bounds when moving left from first column', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 0 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 0 })
    })

    it('clamps to grid bounds when moving right from last column', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 3 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 3 })
    })

    it('initializes focus to first cell when no cell is focused', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      expect(result.current.focusedCell).toBeNull()

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, colIndex: 0 })
    })
  })

  describe('Tab navigation', () => {
    it('moves focus right on Tab', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'Tab',
          shiftKey: false,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 2 })
    })

    it('moves focus left on Shift+Tab', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 2 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'Tab',
          shiftKey: true,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 1 })
    })

    it('wraps to next row at end of row', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 3 }) // Last column
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'Tab',
          shiftKey: false,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, colIndex: 0 })
    })

    it('wraps to previous row at start of row', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 2, colIndex: 0 }) // First column
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'Tab',
          shiftKey: true,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 3 })
    })

    it('calls onAddRow at last cell of last row', async () => {
      const onAddRow = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, onAddRow })
      )

      act(() => {
        result.current.setFocusedCell({ rowIndex: 4, colIndex: 3 }) // Last cell
      })

      await act(async () => {
        await result.current.handleKeyDown({
          key: 'Tab',
          shiftKey: false,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onAddRow).toHaveBeenCalled()
    })
  })

  describe('Edit mode', () => {
    it('starts edit on Enter', () => {
      const onEditStart = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, onEditStart })
      )

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onEditStart).toHaveBeenCalledWith({ rowIndex: 1, colIndex: 1 })
    })

    it('starts edit on F2', () => {
      const onEditStart = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, onEditStart })
      )

      act(() => {
        result.current.setFocusedCell({ rowIndex: 2, colIndex: 2 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'F2',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onEditStart).toHaveBeenCalledWith({ rowIndex: 2, colIndex: 2 })
    })

    it('starts edit with initial char on typing', () => {
      const onEditStart = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, onEditStart })
      )

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'a',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onEditStart).toHaveBeenCalledWith({ rowIndex: 1, colIndex: 1 }, 'a')
    })

    it('cancels edit on Escape', () => {
      const onEditCancel = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({
          ...defaultOptions,
          onEditCancel,
          isEditing: true,
          editingPosition: { rowIndex: 1, colIndex: 1 },
        })
      )

      act(() => {
        result.current.handleKeyDown({
          key: 'Escape',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onEditCancel).toHaveBeenCalled()
    })

    it('confirms edit and moves down on Enter while editing', async () => {
      const onEditConfirm = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({
          ...defaultOptions,
          onEditConfirm,
          isEditing: true,
          editingPosition: { rowIndex: 1, colIndex: 1 },
        })
      )

      await act(async () => {
        await result.current.handleKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onEditConfirm).toHaveBeenCalled()
      expect(result.current.focusedCell).toEqual({ rowIndex: 2, colIndex: 1 })
    })

    it('confirms edit and moves right on Tab while editing', async () => {
      const onEditConfirm = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({
          ...defaultOptions,
          onEditConfirm,
          isEditing: true,
          editingPosition: { rowIndex: 1, colIndex: 1 },
        })
      )

      await act(async () => {
        await result.current.handleKeyDown({
          key: 'Tab',
          shiftKey: false,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onEditConfirm).toHaveBeenCalled()
    })
  })

  describe('Cell clearing', () => {
    it('clears cell on Delete', () => {
      const onClearCell = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, onClearCell })
      )

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 1 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'Delete',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onClearCell).toHaveBeenCalledWith({ rowIndex: 1, colIndex: 1 })
    })

    it('clears cell on Backspace', () => {
      const onClearCell = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, onClearCell })
      )

      act(() => {
        result.current.setFocusedCell({ rowIndex: 2, colIndex: 2 })
      })

      act(() => {
        result.current.handleKeyDown({
          key: 'Backspace',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onClearCell).toHaveBeenCalledWith({ rowIndex: 2, colIndex: 2 })
    })

    it('does not clear when editing', () => {
      const onClearCell = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({
          ...defaultOptions,
          onClearCell,
          isEditing: true,
          editingPosition: { rowIndex: 1, colIndex: 1 },
        })
      )

      act(() => {
        result.current.handleKeyDown({
          key: 'Delete',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(onClearCell).not.toHaveBeenCalled()
    })
  })

  describe('Cell focus helpers', () => {
    it('handleCellFocus sets focused cell', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.handleCellFocus({ rowIndex: 2, colIndex: 3 })
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, colIndex: 3 })
    })

    it('handleCellDoubleClick sets focus and starts edit', () => {
      const onEditStart = vi.fn()
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, onEditStart })
      )

      act(() => {
        result.current.handleCellDoubleClick({ rowIndex: 1, colIndex: 2 })
      })

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, colIndex: 2 })
      expect(onEditStart).toHaveBeenCalledWith({ rowIndex: 1, colIndex: 2 })
    })

    it('isCellFocused returns correct boolean', () => {
      const { result } = renderHook(() => useGridNavigation(defaultOptions))

      act(() => {
        result.current.setFocusedCell({ rowIndex: 1, colIndex: 1 })
      })

      expect(result.current.isCellFocused({ rowIndex: 1, colIndex: 1 })).toBe(true)
      expect(result.current.isCellFocused({ rowIndex: 1, colIndex: 2 })).toBe(false)
      expect(result.current.isCellFocused({ rowIndex: 2, colIndex: 1 })).toBe(false)
    })
  })

  describe('Empty grid handling', () => {
    it('does not crash with zero rows', () => {
      const { result } = renderHook(() =>
        useGridNavigation({ ...defaultOptions, rowCount: 0, colCount: 0 })
      )

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedCell).toBeNull()
    })
  })
})
