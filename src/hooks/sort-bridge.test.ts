import { describe, it, expect } from 'vitest'
import { toSortDescriptor, toSortingState } from './sort-bridge'

describe('toSortDescriptor', () => {
  it('returns undefined for empty sorting state', () => {
    expect(toSortDescriptor([])).toBeUndefined()
  })

  it('converts ascending sort', () => {
    const result = toSortDescriptor([{ id: 'name', desc: false }])
    expect(result).toEqual({ column: 'name', direction: 'ascending' })
  })

  it('converts descending sort', () => {
    const result = toSortDescriptor([{ id: 'name', desc: true }])
    expect(result).toEqual({ column: 'name', direction: 'descending' })
  })
})

describe('toSortingState', () => {
  it('returns empty array when direction is falsy (sort cleared)', () => {
    expect(toSortingState({ column: 'name', direction: undefined as any })).toEqual([])
  })

  it('converts ascending descriptor', () => {
    expect(toSortingState({ column: 'name', direction: 'ascending' })).toEqual([
      { id: 'name', desc: false },
    ])
  })

  it('converts descending descriptor', () => {
    expect(toSortingState({ column: 'name', direction: 'descending' })).toEqual([
      { id: 'name', desc: true },
    ])
  })

  it('converts column to string', () => {
    expect(toSortingState({ column: 'pid' as any, direction: 'ascending' })).toEqual([
      { id: 'pid', desc: false },
    ])
  })
})