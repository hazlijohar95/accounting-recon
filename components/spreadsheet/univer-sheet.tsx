'use client'

/**
 * UniverSheet - Legacy export
 *
 * This module now re-exports from JspreadsheetSheet for backwards compatibility.
 * Univer.js was replaced with Jspreadsheet CE due to React 19 incompatibility.
 */

export {
  JspreadsheetSheet as UniverSheet,
  JspreadsheetSheetReadOnly as UniverSheetReadOnly
} from './jspreadsheet-sheet'
