/**
 * Multi-Tenant Isolation Integration Tests
 *
 * Tests that ensure proper data isolation between companies/tenants.
 * Verifies that users cannot access resources belonging to other companies.
 *
 * @module __tests__/integration/multi-tenant.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Type Definitions
// ============================================================================

interface User {
  _id: string
  workosId: string
  email: string
}

interface Company {
  _id: string
  ownerId: string
  name: string
  isDeleted: boolean
}

interface Document {
  _id: string
  companyId: string
  fileName: string
  uploadedBy: string
}

interface Transaction {
  _id: string
  companyId: string
  description: string
  amount: number
}

interface ReconciliationSession {
  _id: string
  companyId: string
  name: string
  createdBy: string
}

interface Match {
  _id: string
  sessionId: string
  cashTransactionId: string
  status: string
}

// ============================================================================
// Mock Database
// ============================================================================

class MockDatabase {
  users: User[] = []
  companies: Company[] = []
  documents: Document[] = []
  transactions: Transaction[] = []
  sessions: ReconciliationSession[] = []
  matches: Match[] = []

  clear() {
    this.users = []
    this.companies = []
    this.documents = []
    this.transactions = []
    this.sessions = []
    this.matches = []
  }

  addUser(user: User) {
    this.users.push(user)
    return user
  }

  addCompany(company: Company) {
    this.companies.push(company)
    return company
  }

  addDocument(doc: Document) {
    this.documents.push(doc)
    return doc
  }

  addTransaction(txn: Transaction) {
    this.transactions.push(txn)
    return txn
  }

  addSession(session: ReconciliationSession) {
    this.sessions.push(session)
    return session
  }

  addMatch(match: Match) {
    this.matches.push(match)
    return match
  }

  getUser(id: string) {
    return this.users.find((u) => u._id === id) || null
  }

  getCompany(id: string) {
    return this.companies.find((c) => c._id === id) || null
  }

  getDocument(id: string) {
    return this.documents.find((d) => d._id === id) || null
  }

  getTransaction(id: string) {
    return this.transactions.find((t) => t._id === id) || null
  }

  getSession(id: string) {
    return this.sessions.find((s) => s._id === id) || null
  }

  getMatch(id: string) {
    return this.matches.find((m) => m._id === id) || null
  }

  getDocumentsByCompany(companyId: string) {
    return this.documents.filter((d) => d.companyId === companyId)
  }

  getTransactionsByCompany(companyId: string) {
    return this.transactions.filter((t) => t.companyId === companyId)
  }

  getSessionsByCompany(companyId: string) {
    return this.sessions.filter((s) => s.companyId === companyId)
  }
}

// ============================================================================
// Access Control Functions
// ============================================================================

function checkCompanyOwnership(
  user: User,
  company: Company | null
): { allowed: boolean; reason?: string } {
  if (!company) {
    return { allowed: false, reason: 'Company not found' }
  }

  if (company.isDeleted) {
    return { allowed: false, reason: 'Company has been deleted' }
  }

  if (company.ownerId !== user._id) {
    return { allowed: false, reason: 'User does not own this company' }
  }

  return { allowed: true }
}

function checkResourceAccess(
  user: User,
  resourceCompanyId: string,
  db: MockDatabase
): { allowed: boolean; reason?: string } {
  const company = db.getCompany(resourceCompanyId)

  if (!company) {
    return { allowed: false, reason: 'Resource company not found' }
  }

  if (company.ownerId !== user._id) {
    return { allowed: false, reason: 'Cross-tenant access denied' }
  }

  return { allowed: true }
}

function checkDocumentAccess(
  user: User,
  documentId: string,
  db: MockDatabase
): { allowed: boolean; reason?: string } {
  const document = db.getDocument(documentId)

  if (!document) {
    return { allowed: false, reason: 'Document not found' }
  }

  return checkResourceAccess(user, document.companyId, db)
}

function checkSessionAccess(
  user: User,
  sessionId: string,
  db: MockDatabase
): { allowed: boolean; reason?: string } {
  const session = db.getSession(sessionId)

  if (!session) {
    return { allowed: false, reason: 'Session not found' }
  }

  return checkResourceAccess(user, session.companyId, db)
}

// ============================================================================
// Test Setup
// ============================================================================

const db = new MockDatabase()

beforeEach(() => {
  db.clear()

  // Setup: Create two users
  db.addUser({ _id: 'user_A', workosId: 'wo_A', email: 'userA@example.com' })
  db.addUser({ _id: 'user_B', workosId: 'wo_B', email: 'userB@example.com' })

  // Setup: Create companies owned by different users
  db.addCompany({ _id: 'company_A', ownerId: 'user_A', name: 'Company A', isDeleted: false })
  db.addCompany({ _id: 'company_B', ownerId: 'user_B', name: 'Company B', isDeleted: false })

  // Setup: Create documents for each company
  db.addDocument({ _id: 'doc_A1', companyId: 'company_A', fileName: 'invoice_A.pdf', uploadedBy: 'user_A' })
  db.addDocument({ _id: 'doc_B1', companyId: 'company_B', fileName: 'invoice_B.pdf', uploadedBy: 'user_B' })

  // Setup: Create transactions for each company
  db.addTransaction({ _id: 'txn_A1', companyId: 'company_A', description: 'Payment A', amount: -100 })
  db.addTransaction({ _id: 'txn_B1', companyId: 'company_B', description: 'Payment B', amount: -200 })

  // Setup: Create sessions for each company
  db.addSession({ _id: 'session_A', companyId: 'company_A', name: 'Session A', createdBy: 'user_A' })
  db.addSession({ _id: 'session_B', companyId: 'company_B', name: 'Session B', createdBy: 'user_B' })
})

// ============================================================================
// Company Ownership Tests
// ============================================================================

describe('Company Ownership Isolation', () => {
  it('should allow user to access their own company', () => {
    const user = db.getUser('user_A')!
    const company = db.getCompany('company_A')

    const result = checkCompanyOwnership(user, company)

    expect(result.allowed).toBe(true)
  })

  it('should deny user access to another company', () => {
    const user = db.getUser('user_A')!
    const company = db.getCompany('company_B')

    const result = checkCompanyOwnership(user, company)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('does not own')
  })

  it('should deny access to deleted company', () => {
    // Add a deleted company owned by user A
    db.addCompany({ _id: 'company_deleted', ownerId: 'user_A', name: 'Deleted Co', isDeleted: true })

    const user = db.getUser('user_A')!
    const company = db.getCompany('company_deleted')

    const result = checkCompanyOwnership(user, company)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('deleted')
  })

  it('should deny access to non-existent company', () => {
    const user = db.getUser('user_A')!

    const result = checkCompanyOwnership(user, null)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('not found')
  })
})

// ============================================================================
// Document Access Isolation Tests
// ============================================================================

describe('Document Access Isolation', () => {
  it('should allow user to access their own documents', () => {
    const user = db.getUser('user_A')!

    const result = checkDocumentAccess(user, 'doc_A1', db)

    expect(result.allowed).toBe(true)
  })

  it('should deny user access to another company documents', () => {
    const user = db.getUser('user_A')!

    const result = checkDocumentAccess(user, 'doc_B1', db)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Cross-tenant')
  })

  it('should deny access to non-existent document', () => {
    const user = db.getUser('user_A')!

    const result = checkDocumentAccess(user, 'doc_nonexistent', db)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('not found')
  })

  it('should return only own company documents in list', () => {
    const documentsA = db.getDocumentsByCompany('company_A')
    const documentsB = db.getDocumentsByCompany('company_B')

    expect(documentsA).toHaveLength(1)
    expect(documentsA[0]._id).toBe('doc_A1')

    expect(documentsB).toHaveLength(1)
    expect(documentsB[0]._id).toBe('doc_B1')

    // No cross-contamination
    expect(documentsA.some((d) => d.companyId === 'company_B')).toBe(false)
    expect(documentsB.some((d) => d.companyId === 'company_A')).toBe(false)
  })
})

// ============================================================================
// Transaction Access Isolation Tests
// ============================================================================

describe('Transaction Access Isolation', () => {
  it('should allow user to access their own transactions', () => {
    const user = db.getUser('user_A')!
    const txn = db.getTransaction('txn_A1')!

    const result = checkResourceAccess(user, txn.companyId, db)

    expect(result.allowed).toBe(true)
  })

  it('should deny user access to another company transactions', () => {
    const user = db.getUser('user_A')!
    const txn = db.getTransaction('txn_B1')!

    const result = checkResourceAccess(user, txn.companyId, db)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Cross-tenant')
  })

  it('should return only own company transactions in list', () => {
    const transactionsA = db.getTransactionsByCompany('company_A')
    const transactionsB = db.getTransactionsByCompany('company_B')

    expect(transactionsA).toHaveLength(1)
    expect(transactionsA[0].amount).toBe(-100)

    expect(transactionsB).toHaveLength(1)
    expect(transactionsB[0].amount).toBe(-200)
  })
})

// ============================================================================
// Session Access Isolation Tests
// ============================================================================

describe('Session Access Isolation', () => {
  it('should allow user to access their own sessions', () => {
    const user = db.getUser('user_A')!

    const result = checkSessionAccess(user, 'session_A', db)

    expect(result.allowed).toBe(true)
  })

  it('should deny user access to another company sessions', () => {
    const user = db.getUser('user_A')!

    const result = checkSessionAccess(user, 'session_B', db)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Cross-tenant')
  })

  it('should return only own company sessions in list', () => {
    const sessionsA = db.getSessionsByCompany('company_A')
    const sessionsB = db.getSessionsByCompany('company_B')

    expect(sessionsA).toHaveLength(1)
    expect(sessionsA[0].name).toBe('Session A')

    expect(sessionsB).toHaveLength(1)
    expect(sessionsB[0].name).toBe('Session B')
  })
})

// ============================================================================
// Match Access Through Session Tests
// ============================================================================

describe('Match Access Through Session', () => {
  beforeEach(() => {
    // Add matches to sessions
    db.addMatch({ _id: 'match_A1', sessionId: 'session_A', cashTransactionId: 'txn_A1', status: 'pending' })
    db.addMatch({ _id: 'match_B1', sessionId: 'session_B', cashTransactionId: 'txn_B1', status: 'pending' })
  })

  it('should allow access to match via session ownership', () => {
    const user = db.getUser('user_A')!
    const match = db.getMatch('match_A1')!
    const session = db.getSession(match.sessionId)!

    const result = checkResourceAccess(user, session.companyId, db)

    expect(result.allowed).toBe(true)
  })

  it('should deny access to match from another company session', () => {
    const user = db.getUser('user_A')!
    const match = db.getMatch('match_B1')!
    const session = db.getSession(match.sessionId)!

    const result = checkResourceAccess(user, session.companyId, db)

    expect(result.allowed).toBe(false)
  })
})

// ============================================================================
// Cross-Tenant Query Isolation Tests
// ============================================================================

describe('Cross-Tenant Query Isolation', () => {
  it('should never return resources from other companies in queries', () => {
    // Simulate a query that should only return company A's resources
    const companyADocs = db.getDocumentsByCompany('company_A')
    const companyATxns = db.getTransactionsByCompany('company_A')
    const companyASessions = db.getSessionsByCompany('company_A')

    // Verify no company B resources leaked
    for (const doc of companyADocs) {
      expect(doc.companyId).toBe('company_A')
    }

    for (const txn of companyATxns) {
      expect(txn.companyId).toBe('company_A')
    }

    for (const session of companyASessions) {
      expect(session.companyId).toBe('company_A')
    }
  })

  it('should handle multiple companies without data leakage', () => {
    // Add third company and user
    db.addUser({ _id: 'user_C', workosId: 'wo_C', email: 'userC@example.com' })
    db.addCompany({ _id: 'company_C', ownerId: 'user_C', name: 'Company C', isDeleted: false })
    db.addDocument({ _id: 'doc_C1', companyId: 'company_C', fileName: 'invoice_C.pdf', uploadedBy: 'user_C' })

    // Each company should only see their own data
    expect(db.getDocumentsByCompany('company_A')).toHaveLength(1)
    expect(db.getDocumentsByCompany('company_B')).toHaveLength(1)
    expect(db.getDocumentsByCompany('company_C')).toHaveLength(1)

    // Total documents should be 3
    expect(db.documents).toHaveLength(3)
  })
})

// ============================================================================
// Spoofing Prevention Tests
// ============================================================================

describe('Spoofing Prevention', () => {
  it('should detect mismatched claimed vs actual user ID', () => {
    interface AuthContext {
      authenticatedUserId: string | null
      claimedUserId: string | undefined
    }

    function detectSpoofing(ctx: AuthContext): { isSpoofing: boolean; reason?: string } {
      if (ctx.authenticatedUserId && ctx.claimedUserId) {
        if (ctx.authenticatedUserId !== ctx.claimedUserId) {
          return {
            isSpoofing: true,
            reason: `Claimed ID ${ctx.claimedUserId} does not match authenticated ID ${ctx.authenticatedUserId}`,
          }
        }
      }
      return { isSpoofing: false }
    }

    // Normal case - IDs match
    const normalResult = detectSpoofing({
      authenticatedUserId: 'user_A',
      claimedUserId: 'user_A',
    })
    expect(normalResult.isSpoofing).toBe(false)

    // Spoofing attempt - IDs don't match
    const spoofResult = detectSpoofing({
      authenticatedUserId: 'user_A',
      claimedUserId: 'user_B',
    })
    expect(spoofResult.isSpoofing).toBe(true)
    expect(spoofResult.reason).toContain('does not match')
  })

  it('should prevent accessing resources by guessing IDs', () => {
    const user = db.getUser('user_A')!

    // Even if user_A somehow knows the ID of company_B's document
    // they should not be able to access it
    const result = checkDocumentAccess(user, 'doc_B1', db)

    expect(result.allowed).toBe(false)
  })
})

// ============================================================================
// Bulk Operation Isolation Tests
// ============================================================================

describe('Bulk Operation Isolation', () => {
  it('should only process resources belonging to the same company', () => {
    const userA = db.getUser('user_A')!
    const bulkIds = ['doc_A1', 'doc_B1'] // Mixed company documents

    const processable: string[] = []
    const denied: string[] = []

    for (const id of bulkIds) {
      const result = checkDocumentAccess(userA, id, db)
      if (result.allowed) {
        processable.push(id)
      } else {
        denied.push(id)
      }
    }

    // Only doc_A1 should be processable by user A
    expect(processable).toEqual(['doc_A1'])
    expect(denied).toEqual(['doc_B1'])
  })

  it('should reject entire bulk operation if any resource is inaccessible', () => {
    const userA = db.getUser('user_A')!
    const bulkIds = ['doc_A1', 'doc_B1']

    function validateBulkAccess(userId: string, resourceIds: string[]): {
      valid: boolean
      invalidIds: string[]
    } {
      const user = db.getUser(userId)!
      const invalidIds: string[] = []

      for (const id of resourceIds) {
        const result = checkDocumentAccess(user, id, db)
        if (!result.allowed) {
          invalidIds.push(id)
        }
      }

      return {
        valid: invalidIds.length === 0,
        invalidIds,
      }
    }

    const result = validateBulkAccess('user_A', bulkIds)

    expect(result.valid).toBe(false)
    expect(result.invalidIds).toContain('doc_B1')
  })
})

// ============================================================================
// Cascading Delete Isolation Tests
// ============================================================================

describe('Cascading Delete Isolation', () => {
  it('should only delete resources belonging to the deleted company', () => {
    // Simulate deleting company A
    function simulateCascadeDelete(companyId: string, db: MockDatabase) {
      const deletedDocs: string[] = []
      const deletedTxns: string[] = []
      const deletedSessions: string[] = []

      // Mark documents for deletion
      for (const doc of db.documents) {
        if (doc.companyId === companyId) {
          deletedDocs.push(doc._id)
        }
      }

      // Mark transactions for deletion
      for (const txn of db.transactions) {
        if (txn.companyId === companyId) {
          deletedTxns.push(txn._id)
        }
      }

      // Mark sessions for deletion
      for (const session of db.sessions) {
        if (session.companyId === companyId) {
          deletedSessions.push(session._id)
        }
      }

      return { deletedDocs, deletedTxns, deletedSessions }
    }

    const result = simulateCascadeDelete('company_A', db)

    // Should only delete company A's resources
    expect(result.deletedDocs).toEqual(['doc_A1'])
    expect(result.deletedTxns).toEqual(['txn_A1'])
    expect(result.deletedSessions).toEqual(['session_A'])

    // Should not affect company B
    expect(result.deletedDocs).not.toContain('doc_B1')
    expect(result.deletedTxns).not.toContain('txn_B1')
    expect(result.deletedSessions).not.toContain('session_B')
  })
})
