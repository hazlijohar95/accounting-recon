/**
 * AgentUploadAck — Unit Tests
 *
 * Tests filename-based classification and grouping.
 *
 * @module __tests__/components/views/upload-view/agent/agent-upload-ack.test
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentUploadAck } from '@/components/views/upload-view/agent/agent-upload-ack'
import type { UploadedFile } from '@/hooks/useFileUploadState'

// ============================================================================
// Fixtures
// ============================================================================

function createFile(name: string): UploadedFile {
  return {
    id: `file-${Math.random()}`,
    name,
    size: 1024,
    type: 'other',
    file: new File([], name),
    status: 'ready',
    progress: 0,
  } as unknown as UploadedFile
}

// ============================================================================
// Tests
// ============================================================================

describe('AgentUploadAck', () => {
  it('returns null for empty files', () => {
    const { container } = render(<AgentUploadAck files={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('classifies bank statements by filename', () => {
    const files = [
      createFile('ABC_Bank_Jan2024.pdf'),
      createFile('Account_Statement_Feb.pdf'),
    ]
    render(<AgentUploadAck files={files} />)
    expect(screen.getByText('2 bank statements')).toBeInTheDocument()
    expect(screen.getByText('Cash Basis')).toBeInTheDocument()
  })

  it('classifies invoices by filename', () => {
    const files = [
      createFile('INV-2024-001.pdf'),
      createFile('billing_march.pdf'),
    ]
    render(<AgentUploadAck files={files} />)
    expect(screen.getByText('2 invoices')).toBeInTheDocument()
    expect(screen.getByText('Accrual Basis')).toBeInTheDocument()
  })

  it('classifies receipts by filename', () => {
    const files = [createFile('receipt_jan.pdf')]
    render(<AgentUploadAck files={files} />)
    expect(screen.getByText('1 receipt')).toBeInTheDocument()
  })

  it('puts unrecognized files into other group', () => {
    const files = [createFile('report_q1.pdf')]
    render(<AgentUploadAck files={files} />)
    expect(screen.getByText('1 other document')).toBeInTheDocument()
    expect(screen.getByText('To classify')).toBeInTheDocument()
  })

  it('shows total file count in summary', () => {
    const files = [
      createFile('bank_statement.pdf'),
      createFile('INV-001.pdf'),
      createFile('random.pdf'),
    ]
    render(<AgentUploadAck files={files} />)
    expect(screen.getByText(/I see 3 files/)).toBeInTheDocument()
  })

  it('handles singular file count', () => {
    const files = [createFile('bank_statement.pdf')]
    render(<AgentUploadAck files={files} />)
    expect(screen.getByText(/I see 1 file\b/)).toBeInTheDocument()
  })

  it('groups mixed file types correctly', () => {
    const files = [
      createFile('bank_jan.pdf'),
      createFile('bank_feb.pdf'),
      createFile('invoice_001.pdf'),
      createFile('receipt_001.pdf'),
      createFile('annual_report.pdf'),
    ]
    render(<AgentUploadAck files={files} />)
    expect(screen.getByText('2 bank statements')).toBeInTheDocument()
    expect(screen.getByText('1 invoice')).toBeInTheDocument()
    expect(screen.getByText('1 receipt')).toBeInTheDocument()
    expect(screen.getByText('1 other document')).toBeInTheDocument()
  })
})
