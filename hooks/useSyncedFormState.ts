import { useEffect, useState, type DependencyList } from 'react'

export function useSyncedFormState<T>(initialValue: T, deps: DependencyList) {
  const [state, setState] = useState(initialValue)

  useEffect(() => {
    setState(initialValue)
  }, deps)

  return [state, setState] as const
}
