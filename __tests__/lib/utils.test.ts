import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn (className utility)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('handles undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
  })

  it('handles null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar')
  })

  it('handles empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar')
  })

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('handles objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  // Tailwind Merge Functionality

  it('merges conflicting Tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('merges conflicting color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('merges conflicting background classes', () => {
    expect(cn('bg-white', 'bg-black')).toBe('bg-black')
  })

  it('preserves non-conflicting classes', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })

  it('merges responsive variants correctly', () => {
    expect(cn('md:px-2', 'md:px-4')).toBe('md:px-4')
  })

  it('preserves different responsive variants', () => {
    expect(cn('sm:px-2', 'md:px-4')).toBe('sm:px-2 md:px-4')
  })

  it('merges hover variants correctly', () => {
    expect(cn('hover:bg-red-500', 'hover:bg-blue-500')).toBe('hover:bg-blue-500')
  })

  it('handles complex class combinations', () => {
    const result = cn(
      'base-class',
      'p-4',
      true && 'conditional-class',
      { 'object-class': true, 'hidden-class': false },
      ['array-class-1', 'array-class-2'],
      'p-6' // Should override p-4
    )

    expect(result).toContain('base-class')
    expect(result).toContain('conditional-class')
    expect(result).toContain('object-class')
    expect(result).not.toContain('hidden-class')
    expect(result).toContain('array-class-1')
    expect(result).toContain('array-class-2')
    expect(result).toContain('p-6')
    expect(result).not.toContain('p-4')
  })

  it('handles margin classes', () => {
    expect(cn('mt-4', 'mt-8')).toBe('mt-8')
    expect(cn('mx-auto', 'mx-4')).toBe('mx-4')
  })

  it('handles flex classes', () => {
    expect(cn('flex', 'flex-col', 'flex-row')).toBe('flex flex-row')
  })

  it('handles arbitrary values', () => {
    expect(cn('w-[100px]', 'w-[200px]')).toBe('w-[200px]')
  })

  it('handles dark mode classes', () => {
    expect(cn('dark:bg-gray-800', 'dark:bg-gray-900')).toBe('dark:bg-gray-900')
  })

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })

  it('returns empty string for all falsy values', () => {
    expect(cn(false, null, undefined, '')).toBe('')
  })
})
