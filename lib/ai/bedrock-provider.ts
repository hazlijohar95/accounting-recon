import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'

// AWS Bedrock provider configuration
// Credentials are automatically loaded from environment variables:
// - AWS_ACCESS_KEY_ID
// - AWS_SECRET_ACCESS_KEY
// - AWS_REGION (defaults to us-east-1)
export const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || 'us-east-1',
})

// Model configurations for different use cases
// Claude 3.5 Sonnet is ideal for complex reasoning with good cost/performance balance
export const reconciliationModel = bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0')

// Claude 3 Haiku for faster, cheaper operations (onboarding, simple queries)
export const fastModel = bedrock('us.anthropic.claude-3-haiku-20240307-v1:0')
