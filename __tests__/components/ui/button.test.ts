import { describe, expect, it } from 'vitest'
import { buttonVariants } from '@/components/ui/button'

describe('buttonVariants', () => {
  it('returns base and variant classes', () => {
    const className = buttonVariants({ variant: 'primary' })
    expect(className).toContain('inline-flex')
    expect(className).toContain('bg-fd-primary')
  })

  it('supports size and color aliases', () => {
    const className = buttonVariants({ color: 'ghost', size: 'icon' })
    expect(className).toContain('hover:bg-fd-accent')
    expect(className).toContain('p-1.5')
  })
})
