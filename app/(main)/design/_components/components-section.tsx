'use client'

import { ButtonsDemo } from './components/buttons-demo'
import { FormInputsDemo } from './components/form-inputs-demo'
import { CardsDemo } from './components/cards-demo'
import { NavigationDemo } from './components/navigation-demo'
import {
  StatusIndicatorsDemo,
  AlertsEmptyStatesDemo,
  TimelineDemo,
} from './components/status-demos'
import { ModalDemo } from './components/modal-demo'
import { DataTableDemo, ComparisonDiffDemo } from './components/data-display-demos'
import { FilterSearchDemo } from './components/filter-search-demo'

export function ComponentsSection() {
  return (
    <section id="components" className="space-y-12">
      <div>
        <h2 className="text-xl font-medium">Components</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Interactive UI components and their various states.
        </p>
      </div>

      <ButtonsDemo />
      <FormInputsDemo />
      <CardsDemo />
      <NavigationDemo />
      <StatusIndicatorsDemo />
      <ModalDemo />
      <AlertsEmptyStatesDemo />
      <DataTableDemo />
      <TimelineDemo />
      <ComparisonDiffDemo />
      <FilterSearchDemo />
    </section>
  )
}
