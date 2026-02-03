import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useGridSelection,
  cellKey,
  parseKey,
  UseGridSelectionOptions,
} from '@/hooks/useGridSelection'

describe('useGridSelection', () => {
  const defaultOptions: UseGridSelectionOptions = {
    rowCount: 5,
    colCount: 4,
    onSelectionChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cellKey and parseKey utilities', () => {
    it('cellKey creates correct key format', () => {
      expect(cellKey({ rowIndex: 2, colIndex: 3 })).toBe('2:3')
      expect(cellKey({ rowIndex: 0, colIndex: 0 })).toBe('0:0')
    })

    it('parseKey parses key back to position', () => {
      expect(parseKey('2:3')).toEqual({ rowIndex: 2, colIndex: 3 })
      expect(parseKey('0:0')).toEqual({ rowIndex: 0, colIndex: 0 })
    })
  })

  describe('single cell selection', () => {
    it('selects cell on click', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 2 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(result.current.selectedCells.size).toBe(1)
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 2 })).toBe(true)
    })

    it('replaces selection on new click', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 2, colIndex: 2 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(result.current.selectedCells.size).toBe(1)
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 1 })).toBe(false)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 2 })).toBe(true)
    })

    it('sets anchor cell on click', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 2 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(result.current.anchorCell).toEqual({ rowIndex: 1, colIndex: 2 })
    })
  })

  describe('range selection', () => {
    it('selects range on Shift+click', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      // First click to set anchor
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Shift+click to extend
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 3, colIndex: 3 },
          { shiftKey: true, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Should select a 3x3 rectangle (rows 1-3, cols 1-3)
      expect(result.current.selectedCells.size).toBe(9)
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 1 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 2 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 3, colIndex: 3 })).toBe(true)
    })

    it('extends from anchor to clicked cell', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      // Set anchor at 2,2
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 2, colIndex: 2 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Shift+click at 0,0 (should extend backwards)
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 0, colIndex: 0 },
          { shiftKey: true, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Should select 3x3 rectangle from 0,0 to 2,2
      expect(result.current.selectedCells.size).toBe(9)
    })

    it('selects rectangle on drag', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      // Start drag at 1,1
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Drag to 2,2
      act(() => {
        result.current.handleCellMouseEnter({ rowIndex: 2, colIndex: 2 })
      })

      expect(result.current.selectedCells.size).toBe(4)
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 1 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 2 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 1 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 2 })).toBe(true)
    })

    it('updates selection during drag', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 0, colIndex: 0 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      act(() => {
        result.current.handleCellMouseEnter({ rowIndex: 1, colIndex: 1 })
      })

      expect(result.current.selectedCells.size).toBe(4)

      // Extend further
      act(() => {
        result.current.handleCellMouseEnter({ rowIndex: 2, colIndex: 2 })
      })

      expect(result.current.selectedCells.size).toBe(9)
    })
  })

  describe('multi-select', () => {
    it('toggles cell on Cmd/Ctrl+click', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      // Select first cell
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Cmd+click to add another cell
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 2, colIndex: 2 },
          { shiftKey: false, metaKey: true, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(result.current.selectedCells.size).toBe(2)
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 1 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 2 })).toBe(true)
    })

    it('adds to selection without clearing', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      // Select first cell
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 0, colIndex: 0 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Ctrl+click to add
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 3, colIndex: 3 },
          { shiftKey: false, metaKey: false, ctrlKey: true } as React.MouseEvent
        )
      })

      expect(result.current.isCellSelected({ rowIndex: 0, colIndex: 0 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 3, colIndex: 3 })).toBe(true)
    })

    it('removes cell on Cmd+click if already selected', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      // Select cell
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      // Cmd+click same cell to deselect
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: true, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 1 })).toBe(false)
    })
  })

  describe('row/column selection', () => {
    it('selectRow selects all cells in row', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.selectRow(2)
      })

      expect(result.current.selectedCells.size).toBe(4) // colCount = 4
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 0 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 1 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 2 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 2, colIndex: 3 })).toBe(true)
      // Other rows not selected
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 0 })).toBe(false)
    })

    it('selectRow with addToSelection adds to existing selection', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.selectRow(1)
      })

      act(() => {
        result.current.selectRow(3, true)
      })

      expect(result.current.selectedCells.size).toBe(8) // 2 rows * 4 cols
      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 0 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 3, colIndex: 0 })).toBe(true)
    })

    it('selectColumn selects all cells in column', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.selectColumn(2)
      })

      expect(result.current.selectedCells.size).toBe(5) // rowCount = 5
      expect(result.current.isCellSelected({ rowIndex: 0, colIndex: 2 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 4, colIndex: 2 })).toBe(true)
      // Other columns not selected
      expect(result.current.isCellSelected({ rowIndex: 0, colIndex: 1 })).toBe(false)
    })

    it('selectColumn with addToSelection adds to existing selection', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.selectColumn(0)
      })

      act(() => {
        result.current.selectColumn(2, true)
      })

      expect(result.current.selectedCells.size).toBe(10) // 2 cols * 5 rows
    })

    it('selectAll selects entire grid', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.selectAll()
      })

      expect(result.current.selectedCells.size).toBe(20) // 5 rows * 4 cols
    })
  })

  describe('utilities', () => {
    it('isCellSelected returns correct boolean', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(result.current.isCellSelected({ rowIndex: 1, colIndex: 1 })).toBe(true)
      expect(result.current.isCellSelected({ rowIndex: 0, colIndex: 0 })).toBe(false)
    })

    it('getCellsInRange returns correct set', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      const cells = result.current.getCellsInRange(
        { rowIndex: 0, colIndex: 0 },
        { rowIndex: 2, colIndex: 2 }
      )

      expect(cells.size).toBe(9)
      expect(cells.has('0:0')).toBe(true)
      expect(cells.has('1:1')).toBe(true)
      expect(cells.has('2:2')).toBe(true)
      expect(cells.has('3:3')).toBe(false)
    })

    it('getCellsInRange works with inverted coordinates', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      const cells = result.current.getCellsInRange(
        { rowIndex: 2, colIndex: 2 },
        { rowIndex: 0, colIndex: 0 }
      )

      expect(cells.size).toBe(9)
    })

    it('clearSelection empties set', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.selectAll()
      })

      expect(result.current.selectedCells.size).toBe(20)

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedCells.size).toBe(0)
      expect(result.current.anchorCell).toBeNull()
    })
  })

  describe('callbacks', () => {
    it('calls onSelectionChange when selection changes', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useGridSelection({ ...defaultOptions, onSelectionChange })
      )

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 1, colIndex: 1 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(onSelectionChange).toHaveBeenCalled()
      const calledWith = onSelectionChange.mock.calls[0][0]
      expect(calledWith.size).toBe(1)
    })
  })

  describe('drag state', () => {
    it('sets isDragging on mousedown', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      expect(result.current.isDragging).toBe(false)

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 0, colIndex: 0 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      expect(result.current.isDragging).toBe(true)
    })

    it('clears isDragging on mouseup', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 0, colIndex: 0 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.isDragging).toBe(false)
    })

    it('does not update selection on mouseenter when not dragging', () => {
      const { result } = renderHook(() => useGridSelection(defaultOptions))

      // Select a cell then release
      act(() => {
        result.current.handleCellMouseDown(
          { rowIndex: 0, colIndex: 0 },
          { shiftKey: false, metaKey: false, ctrlKey: false } as React.MouseEvent
        )
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const selectionBefore = result.current.selectedCells.size

      // Mouse enter should not change selection
      act(() => {
        result.current.handleCellMouseEnter({ rowIndex: 2, colIndex: 2 })
      })

      expect(result.current.selectedCells.size).toBe(selectionBefore)
    })
  })
})
