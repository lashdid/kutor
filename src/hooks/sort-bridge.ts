import type { SortingState } from '@tanstack/react-table'

export interface SortDescriptor {
  column: string | number
  direction: 'ascending' | 'descending'
}

export function toSortDescriptor(sorting: SortingState): SortDescriptor | undefined {
  const first = sorting[0]
  if (!first) return undefined
  return {
    column: first.id,
    direction: first.desc ? 'descending' : 'ascending',
  }
}

export function toSortingState(descriptor: SortDescriptor): SortingState {
  if (!descriptor.direction) return []
  return [{ id: String(descriptor.column), desc: descriptor.direction === 'descending' }]
}