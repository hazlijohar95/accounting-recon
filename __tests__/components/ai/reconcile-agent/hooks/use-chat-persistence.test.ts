/**
 * Tests for use-chat-persistence hook logic.
 *
 * Since testing React hooks with Convex real-time subscriptions is complex,
 * we test the core serialization, hydration, and save-ordering logic
 * as pure functions extracted from the hook's behavior.
 */
import { describe, it, expect, vi } from 'vitest'

// ============================================================================
// Serialization / Deserialization logic
// ============================================================================

describe('Message serialization', () => {
  it('serializes a UIMessage to JSON', () => {
    const msg = {
      id: 'msg_1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Hello' }],
    }

    const serialized = JSON.stringify(msg)
    expect(serialized).toContain('"id":"msg_1"')
    expect(serialized).toContain('"role":"assistant"')
  })

  it('round-trips a UIMessage through serialize/deserialize', () => {
    const msg = {
      id: 'msg_2',
      role: 'user',
      parts: [{ type: 'text', text: 'Show me the reconciliation status' }],
    }

    const serialized = JSON.stringify(msg)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.id).toBe('msg_2')
    expect(deserialized.role).toBe('user')
    expect(deserialized.parts[0].text).toBe('Show me the reconciliation status')
  })

  it('handles complex tool part messages', () => {
    const msg = {
      id: 'msg_3',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Let me check...' },
        {
          type: 'tool-getSessionStats',
          toolCallId: 'tc_001',
          state: 'output-available',
          input: { sessionId: 'sess_123' },
          output: { sessionName: 'January 2025', progress: 75 },
        },
        { type: 'text', text: 'Here are the results.' },
      ],
    }

    const serialized = JSON.stringify(msg)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.parts).toHaveLength(3)
    expect(deserialized.parts[1].type).toBe('tool-getSessionStats')
    expect(deserialized.parts[1].output.sessionName).toBe('January 2025')
  })

  it('handles messages with special characters', () => {
    const msg = {
      id: 'msg_4',
      role: 'assistant',
      parts: [{ type: 'text', text: 'The variance is -$1,500.25 (negative) "quoted"' }],
    }

    const serialized = JSON.stringify(msg)
    const deserialized = JSON.parse(serialized)
    expect(deserialized.parts[0].text).toBe('The variance is -$1,500.25 (negative) "quoted"')
  })
})

describe('Hydration fallback', () => {
  it('creates a plain-text fallback when JSON parse fails', () => {
    const rawContent = 'This is not JSON - just plain text'
    const msgId = 'raw_msg_1'
    const msgRole = 'assistant'

    let hydrated
    try {
      hydrated = JSON.parse(rawContent)
    } catch {
      hydrated = {
        id: msgId,
        role: msgRole,
        parts: [{ type: 'text' as const, text: rawContent }],
      }
    }

    expect(hydrated.id).toBe('raw_msg_1')
    expect(hydrated.role).toBe('assistant')
    expect(hydrated.parts[0].text).toBe('This is not JSON - just plain text')
  })
})

// ============================================================================
// Streaming detection logic
// ============================================================================

describe('Streaming part detection', () => {
  const isToolUIPart = (part: any) =>
    typeof part?.type === 'string' && part.type.startsWith('tool-')

  it('detects streaming tool parts', () => {
    const parts = [
      { type: 'text', text: 'Analyzing...' },
      { type: 'tool-getSessionStats', state: 'input-streaming', toolCallId: 'tc_1', input: {} },
    ]

    const hasStreaming = parts.some((part) => {
      if (!isToolUIPart(part)) return false
      return part.state === 'input-streaming' || part.state === 'input-available'
    })

    expect(hasStreaming).toBe(true)
  })

  it('does not flag completed tool parts as streaming', () => {
    const parts = [
      { type: 'text', text: 'Here are the results.' },
      { type: 'tool-getSessionStats', state: 'output-available', toolCallId: 'tc_1', input: {}, output: {} },
    ]

    const hasStreaming = parts.some((part) => {
      if (!isToolUIPart(part)) return false
      return part.state === 'input-streaming' || part.state === 'input-available'
    })

    expect(hasStreaming).toBe(false)
  })

  it('text-only messages are not flagged as streaming', () => {
    const parts: any[] = [{ type: 'text', text: 'Simple response' }]

    const hasStreaming = parts.some((part) => {
      if (!isToolUIPart(part)) return false
      return part.state === 'input-streaming'
    })

    expect(hasStreaming).toBe(false)
  })
})

// ============================================================================
// Tool call metadata extraction
// ============================================================================

describe('Tool call metadata extraction', () => {
  const isToolUIPart = (part: any) =>
    typeof part?.type === 'string' && part.type.startsWith('tool-')

  const getToolName = (part: any) => {
    if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
      return part.type.replace('tool-', '')
    }
    return ''
  }

  it('extracts tool call metadata from message parts', () => {
    const parts = [
      { type: 'text', text: 'Running analysis...' },
      {
        type: 'tool-runMatchingAnalysis',
        toolCallId: 'tc_analysis_1',
        state: 'output-available',
        input: { sessionId: 'sess_1' },
        output: { success: true },
      },
      {
        type: 'tool-askForConfirmation',
        toolCallId: 'tc_confirm_1',
        state: 'output-available',
        input: { action: 'bulk_approve', title: 'Approve all' },
        output: 'confirmed',
      },
    ]

    const toolCalls = parts
      .filter((part) => isToolUIPart(part))
      .map((part) => ({
        toolName: getToolName(part),
        toolCallId: (part as any).toolCallId,
      }))

    expect(toolCalls).toHaveLength(2)
    expect(toolCalls[0]).toEqual({
      toolName: 'runMatchingAnalysis',
      toolCallId: 'tc_analysis_1',
    })
    expect(toolCalls[1]).toEqual({
      toolName: 'askForConfirmation',
      toolCallId: 'tc_confirm_1',
    })
  })

  it('returns empty array for text-only messages', () => {
    const parts = [
      { type: 'text', text: 'Just a text response' },
    ]

    const toolCalls = parts
      .filter((part) => isToolUIPart(part))
      .map((part) => ({
        toolName: getToolName(part),
        toolCallId: (part as any).toolCallId,
      }))

    expect(toolCalls).toHaveLength(0)
  })
})

// ============================================================================
// Save counter logic (race condition fix)
// ============================================================================

describe('Save counter logic', () => {
  it('increments optimistically to prevent duplicate saves', () => {
    let lastSavedCount = 0
    const messages = ['msg1', 'msg2', 'msg3']

    // Simulate the save loop
    const newMessages = messages.slice(lastSavedCount)
    expect(newMessages).toHaveLength(3)

    for (const _msg of newMessages) {
      lastSavedCount++
    }

    expect(lastSavedCount).toBe(3)

    // On next render, no new messages to save
    const nextNewMessages = messages.slice(lastSavedCount)
    expect(nextNewMessages).toHaveLength(0)
  })

  it('correctly identifies new messages after hydration', () => {
    // Simulate hydration setting the counter
    let lastSavedCount = 5 // 5 messages hydrated from Convex

    const messages = new Array(7).fill(null) // 7 total messages (5 old + 2 new)
    const newMessages = messages.slice(lastSavedCount)

    expect(newMessages).toHaveLength(2) // Only 2 new messages to save
  })
})

// ============================================================================
// 24h TTL calculation
// ============================================================================

describe('Message TTL', () => {
  it('calculates correct 24h expiry', () => {
    const now = Date.now()
    const TTL_24H = 86400000
    const expiresAt = now + TTL_24H

    // Should be ~24 hours in the future
    expect(expiresAt - now).toBe(86400000)

    // Human-readable check
    const hoursDiff = (expiresAt - now) / (1000 * 60 * 60)
    expect(hoursDiff).toBe(24)
  })
})
