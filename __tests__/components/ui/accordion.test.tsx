import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

describe('Accordion', () => {
  it('renders content and applies base styles', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionHeader>
            <AccordionTrigger>Details</AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>Panel content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Panel content')).toBeInTheDocument()
  })
})
