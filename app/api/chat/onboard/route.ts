import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { NextRequest } from 'next/server'
import { fastModel } from '@/lib/ai/bedrock-provider'
import { ONBOARDING_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { getSession } from '@/lib/auth-server'
import { z } from 'zod'
import { validateCSRF } from '@/lib/csrf'
import { checkRateLimit, RateLimits, createRateLimitHeaders, getRateLimitIdentifier } from '@/lib/rate-limit'

export const maxDuration = 30

// SECURITY: Maximum messages per request
const MAX_MESSAGES = 100

export async function POST(req: NextRequest) {
  try {
    // SECURITY: CSRF validation
    const csrf = validateCSRF(req)
    if (!csrf.valid) {
      return new Response(
        JSON.stringify({ error: csrf.error }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Require authentication
    const session = await getSession()
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Rate limiting (20 chat requests per minute)
    const rateLimitResult = checkRateLimit(
      getRateLimitIdentifier(session),
      'chat',
      RateLimits.chat
    )
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...createRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { messages } = body as { messages: UIMessage[] }

    // SECURITY: Validate messages array
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Limit message array length
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `Too many messages. Maximum is ${MAX_MESSAGES}.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = streamText({
      model: fastModel,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: {
        createCompanyProfile: {
          description: 'Create a new company profile with the collected information',
          inputSchema: z.object({
            companyName: z.string().max(100).describe('The company name'),
            industryCategory: z.enum(['F&B', 'Retail', 'Services', 'Manufacturing', 'Tech', 'Other']).describe('Industry category'),
            taxRegistered: z.boolean().describe('Whether the company is tax registered'),
            taxNumber: z.string().max(50).optional().describe('Tax registration number if registered'),
            primaryBank: z.enum(['Maybank', 'CIMB', 'Public Bank', 'RHB', 'Hong Leong', 'Other']).describe('Primary bank'),
            fiscalYearEnd: z.enum(['December', 'March', 'June', 'September', 'Other']).describe('Fiscal year end month'),
          }),
          execute: async (profile) => {
            return {
              success: true,
              profile,
              message: `Company "${profile.companyName}" profile created successfully!`,
            }
          },
        },
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Onboarding API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
