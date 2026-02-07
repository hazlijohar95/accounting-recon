import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useGridHistory,
  createCellEditAction,
  createRowDeleteAction,
  GridAction,
} from '@/hooks/useGridHistory'

describe('useGridHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('pushAction', () => {
    it('adds action to undo stack', () => {
      const { result } = renderHook(() => useGridHistory())

      const action = {
        type: 'cell_edit' as const,
        description: 'Test action',
        undo: vi.fn().mockResolvedValue(undefined),
        redo: vi.fn().mockResolvedValue(undefined),
      }

      act(() => {
        result.current.pushAction(action)
      })

      expect(result.current.canUndo).toBe(true)
      expect(result.current.lastActionDescription).toBe('Test action')
    })

    it('clears redo stack on new action', async () => {
      const { result } = renderHook(() => useGridHistory())

      const action1 = {
        type: 'cell_edit' as const,
        description: 'Action 1',
        undo: vi.fn().mockResolvedValue(undefined),
        redo: vi.fn().mockResolvedValue(undefined),
      }

      const action2 = {
        type: 'cell_edit' as const,
        description: 'Action 2',
        undo: vi.fn().mockResolvedValue(undefined),
        redo: vi.fn().mockResolvedValue(undefined),
      }

      act(() => {
        result.current.pushAction(action1)
      })

      // Undo to create redo stack
      await act(async () => {
        await result.current.undo()
      })

      expect(result.current.canRedo).toBe(true)

      // Push new action - should clear redo stack
      act(() => {
        result.current.pushAction(action2)
      })

      expect(result.current.canRedo).toBe(false)
    })

    it('respects maxStackSize limit', () => {
      const { result } = renderHook(() => useGridHistory({ maxStackSize: 3 }))

      // Add 5 actions
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.pushAction({
            type: 'cell_edit' as const,
            description: `Action ${i}`,
            undo: vi.fn().mockResolvedValue(undefined),
            redo: vi.fn().mockResolvedValue(undefined),
          })
        })
      }

      // Should only have 3 in the stack (last 3 actions)
      expect(result.current.lastActionDescription).toBe('Action 4')
    })
  })

  describe('undo', () => {
    it('calls action.undo()', async () => {
      const undoFn = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useGridHistory())

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: undoFn,
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      await act(async () => {
        await result.current.undo()
      })

      expect(undoFn).toHaveBeenCalled()
    })

    it('moves action to redo stack', async () => {
      const { result } = renderHook(() => useGridHistory())

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: vi.fn().mockResolvedValue(undefined),
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      expect(result.current.canRedo).toBe(false)

      await act(async () => {
        await result.current.undo()
      })

      expect(result.current.canRedo).toBe(true)
      expect(result.current.canUndo).toBe(false)
    })

    it('triggers onUndo callback', async () => {
      const onUndo = vi.fn()
      const { result } = renderHook(() => useGridHistory({ onUndo }))

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: vi.fn().mockResolvedValue(undefined),
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      await act(async () => {
        await result.current.undo()
      })

      expect(onUndo).toHaveBeenCalled()
    })

    it('does nothing when stack empty', async () => {
      const { result } = renderHook(() => useGridHistory())

      expect(result.current.canUndo).toBe(false)

      // Should not throw
      await act(async () => {
        await result.current.undo()
      })

      expect(result.current.canUndo).toBe(false)
    })

    it('sets canUndo to false while processing', async () => {
      let resolveUndo: (() => void) | null = null
      const slowUndo = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveUndo = resolve
        })
      )
      const { result } = renderHook(() => useGridHistory())

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: slowUndo,
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      expect(result.current.canUndo).toBe(true)

      // Start undo (slow) - don't await yet
      let undoPromise: Promise<void> | null = null
      act(() => {
        undoPromise = result.current.undo()
      })

      // canUndo should be false while processing
      expect(result.current.canUndo).toBe(false)

      // Resolve the slow undo
      act(() => {
        resolveUndo?.()
      })

      await act(async () => {
        await undoPromise
      })
    })
  })

  describe('redo', () => {
    it('calls action.redo()', async () => {
      const redoFn = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useGridHistory())

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: vi.fn().mockResolvedValue(undefined),
          redo: redoFn,
        })
      })

      await act(async () => {
        await result.current.undo()
      })

      await act(async () => {
        await result.current.redo()
      })

      expect(redoFn).toHaveBeenCalled()
    })

    it('moves action back to undo stack', async () => {
      const { result } = renderHook(() => useGridHistory())

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: vi.fn().mockResolvedValue(undefined),
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      await act(async () => {
        await result.current.undo()
      })

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)

      await act(async () => {
        await result.current.redo()
      })

      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)
    })

    it('triggers onRedo callback', async () => {
      const onRedo = vi.fn()
      const { result } = renderHook(() => useGridHistory({ onRedo }))

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: vi.fn().mockResolvedValue(undefined),
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      await act(async () => {
        await result.current.undo()
      })

      await act(async () => {
        await result.current.redo()
      })

      expect(onRedo).toHaveBeenCalled()
    })

    it('does nothing when stack empty', async () => {
      const { result } = renderHook(() => useGridHistory())

      expect(result.current.canRedo).toBe(false)

      // Should not throw
      await act(async () => {
        await result.current.redo()
      })

      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('keyboard shortcuts', () => {
    it('triggers undo on Cmd+Z', async () => {
      const { result } = renderHook(() => useGridHistory())
      const undoFn = vi.fn().mockResolvedValue(undefined)

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: undoFn,
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      await act(async () => {
        result.current.handleKeyDown({
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          key: 'z',
          preventDefault: vi.fn(),
        } as unknown as KeyboardEvent)
      })

      await waitFor(() => {
        expect(undoFn).toHaveBeenCalled()
      })
    })

    it('triggers undo on Ctrl+Z', async () => {
      const { result } = renderHook(() => useGridHistory())
      const undoFn = vi.fn().mockResolvedValue(undefined)

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: undoFn,
          redo: vi.fn().mockResolvedValue(undefined),
        })
      })

      await act(async () => {
        result.current.handleKeyDown({
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          key: 'z',
          preventDefault: vi.fn(),
        } as unknown as KeyboardEvent)
      })

      await waitFor(() => {
        expect(undoFn).toHaveBeenCalled()
      })
    })

    it('triggers redo on Cmd+Shift+Z', async () => {
      const { result } = renderHook(() => useGridHistory())
      const redoFn = vi.fn().mockResolvedValue(undefined)

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: vi.fn().mockResolvedValue(undefined),
          redo: redoFn,
        })
      })

      await act(async () => {
        await result.current.undo()
      })

      await act(async () => {
        result.current.handleKeyDown({
          metaKey: true,
          ctrlKey: false,
          shiftKey: true,
          key: 'z',
          preventDefault: vi.fn(),
        } as unknown as KeyboardEvent)
      })

      await waitFor(() => {
        expect(redoFn).toHaveBeenCalled()
      })
    })

    it('triggers redo on Ctrl+Y', async () => {
      const { result } = renderHook(() => useGridHistory())
      const redoFn = vi.fn().mockResolvedValue(undefined)

      act(() => {
        result.current.pushAction({
          type: 'cell_edit' as const,
          description: 'Test',
          undo: vi.fn().mockResolvedValue(undefined),
          redo: redoFn,
        })
      })

      await act(async () => {
        await result.current.undo()
      })

      await act(async () => {
        result.current.handleKeyDown({
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          key: 'y',
          preventDefault: vi.fn(),
        } as unknown as KeyboardEvent)
      })

      await waitFor(() => {
        expect(redoFn).toHaveBeenCalled()
      })
    })
  })

  describe('createCellEditAction', () => {
    it('undoes to previous value', async () => {
      const updateCell = vi.fn().mockResolvedValue(undefined)
      const action = createCellEditAction(
        'row-1',
        'col_0',
        'old value',
        'new value',
        updateCell
      )

      await action.undo()

      expect(updateCell).toHaveBeenCalledWith('row-1', 'col_0', 'old value')
    })

    it('redoes to new value', async () => {
      const updateCell = vi.fn().mockResolvedValue(undefined)
      const action = createCellEditAction(
        'row-1',
        'col_0',
        'old value',
        'new value',
        updateCell
      )

      await action.redo()

      expect(updateCell).toHaveBeenCalledWith('row-1', 'col_0', 'new value')
    })

    it('has correct action type and description', () => {
      const updateCell = vi.fn().mockResolvedValue(undefined)
      const action = createCellEditAction(
        'row-1',
        'col_0',
        'old',
        'new',
        updateCell
      )

      expect(action.type).toBe('cell_edit')
      expect(action.description).toBe('Cell edited')
    })
  })

  describe('createRowDeleteAction', () => {
    it('restores row on undo', async () => {
      const addRow = vi.fn().mockResolvedValue('new-row-id')
      const deleteRow = vi.fn().mockResolvedValue(undefined)
      const rowData = { col_0: 'value1', col_1: 'value2' }

      const action = createRowDeleteAction(
        'original-row-id',
        rowData,
        'worksheet-id',
        addRow,
        deleteRow
      )

      await action.undo()

      expect(addRow).toHaveBeenCalledWith('worksheet-id', rowData)
    })

    it('deletes restored row on redo', async () => {
      const addRow = vi.fn().mockResolvedValue('restored-row-id')
      const deleteRow = vi.fn().mockResolvedValue(undefined)
      const rowData = { col_0: 'value1' }

      const action = createRowDeleteAction(
        'original-row-id',
        rowData,
        'worksheet-id',
        addRow,
        deleteRow
      )

      // First undo to restore
      await action.undo()

      // Then redo to delete
      await action.redo()

      expect(deleteRow).toHaveBeenCalledWith('restored-row-id')
    })

    it('handles redo when row was already deleted', async () => {
      const addRow = vi.fn().mockResolvedValue('restored-row-id')
      const deleteRow = vi.fn().mockRejectedValue(new Error('Row not found'))
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const rowData = { col_0: 'value1' }

      const action = createRowDeleteAction(
        'original-row-id',
        rowData,
        'worksheet-id',
        addRow,
        deleteRow
      )

      await action.undo()

      // Should not throw even when deleteRow fails
      await expect(action.redo()).resolves.not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Row delete redo failed (row may already be deleted):',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('has correct action type and description', () => {
      const action = createRowDeleteAction(
        'row-id',
        {},
        'worksheet-id',
        vi.fn(),
        vi.fn()
      )

      expect(action.type).toBe('row_delete')
      expect(action.description).toBe('Row deleted')
    })
  })
})
