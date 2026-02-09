/**
 * Custom Formula Registry for Univer Spreadsheet
 *
 * Provides custom formula implementations including:
 * - =ENRICH(cell, "prompt") - AI-powered cell enrichment
 * - =RECON_MATCH() - Reconciliation matching lookup (future)
 * - =CONFIDENCE() - Match confidence score (future)
 *
 * @module components/unified-sheet/formulas/formula-registry
 */

import type { Id } from '@/convex/_generated/dataModel'

/**
 * Formula execution result
 */
export interface FormulaResult {
  /** The computed value (or placeholder) */
  value: unknown
  /** Status of the formula computation */
  status: 'pending' | 'running' | 'complete' | 'error'
  /** Error message if status is 'error' */
  error?: string
  /** Job ID if this is an async formula */
  jobId?: Id<'agentJobs'>
  /** Metadata for tracking */
  metadata?: Record<string, unknown>
}

/**
 * Formula definition
 */
export interface FormulaDefinition {
  /** Formula name (e.g., 'ENRICH') */
  name: string
  /** Description of what the formula does */
  description: string
  /** Expected arguments */
  args: Array<{
    name: string
    type: 'cell' | 'string' | 'number' | 'boolean' | 'any'
    required: boolean
    description: string
  }>
  /** Whether this formula is async (requires job processing) */
  isAsync: boolean
  /** Execute the formula */
  execute: (
    args: unknown[],
    context: FormulaContext
  ) => FormulaResult | Promise<FormulaResult>
}

/**
 * Context provided to formula execution
 */
export interface FormulaContext {
  /** Current worksheet ID */
  worksheetId: Id<'worksheets'>
  /** Row number (0-indexed) */
  rowNumber: number
  /** Column number (0-indexed) */
  columnNumber: number
  /** Row ID in Convex */
  rowId?: Id<'worksheetRows'>
  /** Column ID in Convex */
  columnId?: Id<'worksheetColumns'>
  /** User ID */
  userId?: Id<'users'>
  /** Function to get a cell value by reference */
  getCellValue?: (ref: string) => unknown
  /** Function to create an agent job */
  createJob?: (params: {
    input: string
    prompt: string
    dataSource: string
  }) => Promise<Id<'agentJobs'>>
}

/**
 * Formula Registry
 *
 * Manages custom formula definitions and execution.
 */
export class FormulaRegistry {
  private formulas: Map<string, FormulaDefinition> = new Map()
  private static instance: FormulaRegistry | null = null

  /**
   * Get the singleton instance
   */
  static getInstance(): FormulaRegistry {
    if (!FormulaRegistry.instance) {
      FormulaRegistry.instance = new FormulaRegistry()
      FormulaRegistry.instance.registerBuiltinFormulas()
    }
    return FormulaRegistry.instance
  }

  /**
   * Register a custom formula
   */
  register(formula: FormulaDefinition): void {
    const name = formula.name.toUpperCase()
    if (this.formulas.has(name)) {
      console.warn(`[FormulaRegistry] Overwriting existing formula: ${name}`)
    }
    this.formulas.set(name, formula)
  }

  /**
   * Unregister a formula
   */
  unregister(name: string): boolean {
    return this.formulas.delete(name.toUpperCase())
  }

  /**
   * Get a formula definition by name
   */
  get(name: string): FormulaDefinition | undefined {
    return this.formulas.get(name.toUpperCase())
  }

  /**
   * Check if a formula is registered
   */
  has(name: string): boolean {
    return this.formulas.has(name.toUpperCase())
  }

  /**
   * List all registered formulas
   */
  list(): FormulaDefinition[] {
    return Array.from(this.formulas.values())
  }

  /**
   * Parse a formula string and extract name and arguments
   */
  parse(formula: string): { name: string; args: string[] } | null {
    // Match patterns like =ENRICH(A1, "prompt") or =ENRICH("input", "prompt")
    const match = formula.match(/^=([A-Z_][A-Z_0-9]*)\s*\((.*)\)$/i)
    if (!match) return null

    const name = match[1].toUpperCase()
    const argsString = match[2]

    // Parse arguments (simplified - handles strings and cell refs)
    const args: string[] = []
    let current = ''
    let inString = false
    let stringChar = ''
    let depth = 0

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i]

      if (!inString && (char === '"' || char === "'")) {
        inString = true
        stringChar = char
        current += char
      } else if (inString && char === stringChar) {
        inString = false
        stringChar = ''
        current += char
      } else if (!inString && char === '(') {
        depth++
        current += char
      } else if (!inString && char === ')') {
        depth--
        current += char
      } else if (!inString && depth === 0 && char === ',') {
        args.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    if (current.trim()) {
      args.push(current.trim())
    }

    return { name, args }
  }

  /**
   * Execute a formula
   */
  async execute(
    formula: string,
    context: FormulaContext
  ): Promise<FormulaResult> {
    const parsed = this.parse(formula)
    if (!parsed) {
      return {
        value: '#ERROR!',
        status: 'error',
        error: 'Invalid formula syntax',
      }
    }

    const definition = this.get(parsed.name)
    if (!definition) {
      return {
        value: '#NAME?',
        status: 'error',
        error: `Unknown formula: ${parsed.name}`,
      }
    }

    // Validate argument count
    const requiredArgs = definition.args.filter(a => a.required).length
    if (parsed.args.length < requiredArgs) {
      return {
        value: '#VALUE!',
        status: 'error',
        error: `${parsed.name} requires at least ${requiredArgs} argument(s)`,
      }
    }

    // Convert string arguments (remove quotes)
    const processedArgs = parsed.args.map(arg => {
      // Check if it's a quoted string
      if ((arg.startsWith('"') && arg.endsWith('"')) ||
          (arg.startsWith("'") && arg.endsWith("'"))) {
        return arg.slice(1, -1)
      }
      // Check if it's a number
      const num = parseFloat(arg)
      if (!isNaN(num) && isFinite(num)) {
        return num
      }
      // Check if it's a cell reference (e.g., A1, B2)
      if (/^[A-Z]+[0-9]+$/i.test(arg)) {
        // Resolve cell reference if getCellValue is provided
        if (context.getCellValue) {
          return context.getCellValue(arg)
        }
        return arg // Return reference as-is
      }
      // Return as string
      return arg
    })

    try {
      const result = await definition.execute(processedArgs, context)
      return result
    } catch (error) {
      return {
        value: '#ERROR!',
        status: 'error',
        error: error instanceof Error ? error.message : 'Execution error',
      }
    }
  }

  /**
   * Register built-in formulas
   */
  private registerBuiltinFormulas(): void {
    // =ENRICH(input, prompt)
    this.register({
      name: 'ENRICH',
      description: 'Enrich a cell value using AI',
      args: [
        {
          name: 'input',
          type: 'any',
          required: true,
          description: 'The input value or cell reference to enrich',
        },
        {
          name: 'prompt',
          type: 'string',
          required: true,
          description: 'Instructions for the AI enrichment',
        },
        {
          name: 'dataSource',
          type: 'string',
          required: false,
          description: 'Data source to use (default: "llm")',
        },
      ],
      isAsync: true,
      execute: async (args, context) => {
        const [inputValue, prompt, dataSource = 'llm'] = args

        // Validate input
        if (inputValue === undefined || inputValue === null || inputValue === '') {
          return {
            value: '',
            status: 'complete',
          }
        }

        // Check if we can create a job
        if (!context.createJob) {
          return {
            value: '#ERROR!',
            status: 'error',
            error: 'Job creation not available',
          }
        }

        if (!context.rowId || !context.columnId) {
          return {
            value: '#ERROR!',
            status: 'error',
            error: 'Row or column ID not available',
          }
        }

        try {
          // Create the agent job
          const jobId = await context.createJob({
            input: String(inputValue),
            prompt: String(prompt),
            dataSource: String(dataSource),
          })

          // Return pending status with placeholder
          return {
            value: '⏳ Loading...',
            status: 'pending',
            jobId,
            metadata: {
              input: inputValue,
              prompt,
              dataSource,
            },
          }
        } catch (error) {
          return {
            value: '#ERROR!',
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to create job',
          }
        }
      },
    })

    // =RECON_MATCH(transactionRef) - Future implementation
    this.register({
      name: 'RECON_MATCH',
      description: 'Look up the matching invoice for a transaction reference',
      args: [
        {
          name: 'reference',
          type: 'string',
          required: true,
          description: 'Transaction reference to look up',
        },
      ],
      isAsync: false,
      execute: (args, _context) => {
        // Placeholder - will be implemented when reconciliation integration is added
        return {
          value: `#NOT_IMPL: ${args[0]}`,
          status: 'error',
          error: 'RECON_MATCH is not yet implemented',
        }
      },
    })

    // =CONFIDENCE(cell) - Future implementation
    this.register({
      name: 'CONFIDENCE',
      description: 'Get the confidence score for a matched cell',
      args: [
        {
          name: 'cell',
          type: 'cell',
          required: true,
          description: 'Cell reference to check confidence for',
        },
      ],
      isAsync: false,
      execute: (args, _context) => {
        // Placeholder - will be implemented when match metadata is available
        return {
          value: `#NOT_IMPL: ${args[0]}`,
          status: 'error',
          error: 'CONFIDENCE is not yet implemented',
        }
      },
    })
  }
}

/**
 * Get the global formula registry instance
 */
export function getFormulaRegistry(): FormulaRegistry {
  return FormulaRegistry.getInstance()
}

/**
 * Check if a formula string is a custom formula
 */
export function isCustomFormula(formula: string): boolean {
  const parsed = getFormulaRegistry().parse(formula)
  return parsed !== null && getFormulaRegistry().has(parsed.name)
}

/**
 * Placeholder values shown while async formulas are processing
 */
export const FORMULA_PLACEHOLDERS = {
  PENDING: '⏳ Loading...',
  RUNNING: '⚙️ Processing...',
  ERROR: '#ERROR!',
}
