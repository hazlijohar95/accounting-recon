// Tool type definitions for AI SDK
// Note: Actual tool implementations are defined inline in API routes for better type inference
// This file provides reusable type definitions and schemas

import { z } from 'zod'

// Schema definitions for tool parameters
// These can be imported by API routes for consistency

export const explainMatchSchema = z.object({
  matchId: z.string().describe('The ID of the match to explain'),
  includeAlternatives: z.boolean().optional().describe('Whether to suggest alternative matches'),
})

export const findMatchForSuspenseSchema = z.object({
  transactionId: z.string().describe('The ID of the suspense transaction'),
  maxResults: z.number().optional().default(5).describe('Maximum number of suggestions'),
})

export const expenseInsightsSchema = z.object({
  dateRange: z.object({
    start: z.string().describe('Start date in ISO format'),
    end: z.string().describe('End date in ISO format'),
  }).optional(),
  category: z.string().optional().describe('Filter by expense category'),
})

export const createCompanyProfileSchema = z.object({
  companyName: z.string().describe('The company name'),
  industryCategory: z.enum(['F&B', 'Retail', 'Services', 'Manufacturing', 'Tech', 'Other']).describe('Industry category'),
  taxRegistered: z.boolean().describe('Whether the company is tax registered'),
  taxNumber: z.string().optional().describe('Tax registration number if registered'),
  primaryBank: z.enum(['Maybank', 'CIMB', 'Public Bank', 'RHB', 'Hong Leong', 'Other']).describe('Primary bank'),
  fiscalYearEnd: z.enum(['December', 'March', 'June', 'September', 'Other']).describe('Fiscal year end month'),
})

export const suggestMatchActionSchema = z.object({
  matchId: z.string().describe('The match ID'),
  action: z.enum(['approve', 'reject', 'review']).describe('Suggested action'),
  reason: z.string().describe('Reason for the suggestion'),
  confidence: z.number().min(0).max(100).describe('Confidence in the suggestion'),
})

// Type exports for use in components
export type ExplainMatchParams = z.infer<typeof explainMatchSchema>
export type FindMatchForSuspenseParams = z.infer<typeof findMatchForSuspenseSchema>
export type ExpenseInsightsParams = z.infer<typeof expenseInsightsSchema>
export type CreateCompanyProfileParams = z.infer<typeof createCompanyProfileSchema>
export type SuggestMatchActionParams = z.infer<typeof suggestMatchActionSchema>
