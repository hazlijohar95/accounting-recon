import { describe, expect, it } from 'vitest'
import { rehypeWrapWords } from '@/components/markdown'
import type { Root } from 'hast'

describe('rehypeWrapWords', () => {
  it('wraps text nodes into span elements', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'text', value: 'Hello world' },
      ],
    }

    const transform = rehypeWrapWords()
    transform(tree)

    const child = tree.children[0]
    expect(child.type).toBe('element')
    if (child.type === 'element') {
      expect(child.tagName).toBe('span')
      expect(child.children.length).toBeGreaterThan(0)
    }
  })

  it('skips wrapping text inside pre elements', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'pre', properties: {}, children: [{ type: 'text', value: 'code' }] },
      ],
    }

    const transform = rehypeWrapWords()
    transform(tree)

    const child = tree.children[0]
    expect(child.type).toBe('element')
    if (child.type === 'element') {
      expect(child.tagName).toBe('pre')
      expect(child.children[0].type).toBe('text')
    }
  })
})
