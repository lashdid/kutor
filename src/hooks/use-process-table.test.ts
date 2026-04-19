// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProcessTable } from './use-process-table'
import type { Process } from '../types/process'

const mockProcesses: Process[] = [
  {
    id: '1',
    name: 'zebra-server',
    command: 'node server.js',
    working_directory: '/home/zebra',
    status: 'running',
    error_message: null,
    memory_bytes: 1024,
    uptime_secs: 60,
    pid: 100,
  },
  {
    id: '2',
    name: 'alpha-worker',
    command: 'python worker.py',
    working_directory: '/home/alpha',
    status: 'crashed',
    error_message: 'OOM',
    memory_bytes: null,
    uptime_secs: null,
    pid: null,
  },
  {
    id: '3',
    name: 'beta-task',
    command: 'cargo run',
    working_directory: '/home/beta',
    status: 'stopped',
    error_message: null,
    memory_bytes: 2048,
    uptime_secs: 120,
    pid: null,
  },
]

describe('useProcessTable', () => {
  it('sorts by name ascending', () => {
    const { result } = renderHook(() => useProcessTable(mockProcesses))
    act(() => {
      result.current.table.setSorting([{ id: 'name', desc: false }])
    })
    const rows = result.current.table.getRowModel().rows
    expect(rows[0].original.name).toBe('alpha-worker')
    expect(rows[1].original.name).toBe('beta-task')
    expect(rows[2].original.name).toBe('zebra-server')
  })

  it('sorts by name descending', () => {
    const { result } = renderHook(() => useProcessTable(mockProcesses))
    act(() => {
      result.current.table.setSorting([{ id: 'name', desc: true }])
    })
    const rows = result.current.table.getRowModel().rows
    expect(rows[0].original.name).toBe('zebra-server')
    expect(rows[2].original.name).toBe('alpha-worker')
  })

  it('filters processes by global search on name', () => {
    const { result } = renderHook(() => useProcessTable(mockProcesses))
    act(() => {
      result.current.setGlobalFilter('alpha')
    })
    const rows = result.current.table.getRowModel().rows
    expect(rows).toHaveLength(1)
    expect(rows[0].original.name).toBe('alpha-worker')
  })

  it('filters processes by global search on status', () => {
    const { result } = renderHook(() => useProcessTable(mockProcesses))
    act(() => {
      result.current.setGlobalFilter('crashed')
    })
    const rows = result.current.table.getRowModel().rows
    expect(rows).toHaveLength(1)
    expect(rows[0].original.name).toBe('alpha-worker')
  })

  it('paginates with page size of 15', () => {
    const { result } = renderHook(() => useProcessTable(mockProcesses))
    expect(result.current.table.getState().pagination.pageSize).toBe(15)
  })

  it('returns all rows when data fits within one page', () => {
    const { result } = renderHook(() => useProcessTable(mockProcesses))
    const rows = result.current.table.getRowModel().rows
    expect(rows).toHaveLength(3)
  })

  it('handles empty array without errors', () => {
    const { result } = renderHook(() => useProcessTable([]))
    expect(result.current.table.getRowModel().rows).toHaveLength(0)
  })
})