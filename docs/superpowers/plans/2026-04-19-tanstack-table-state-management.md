# TanStack Table State Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current static HeroUI Table with a TanStack Table-backed implementation that supports sorting, search/filter, and pagination, all driven by TanStack React Query data.

**Architecture:** Use `@tanstack/react-table` (already installed) for headless table state management (sorting, filtering, pagination) and TanStack React Query for data fetching. The HeroUI Table component serves as the visual rendering layer. A custom `useProcessTable` hook encapsulates all table state and logic, keeping the `ProcessTable` component focused on rendering. Sort state is bridged between TanStack Table and HeroUI's `SortDescriptor` format. The search input uses HeroUI v3's `SearchField` component (which has `onChange=(value: string) => void`, matching our `setGlobalFilter` signature directly). Action buttons and status chips preserve the existing UX with HeroUI `Chip` and `Tooltip`.

**Tech Stack:** `@tanstack/react-table` v8, `@tanstack/react-query` v5, `@heroui/react` v3 (SearchField, Table, Pagination, Chip, Tooltip, Button), React 19, TypeScript, Vitest

---

## File Structure

| File | Responsibility |
|---|---|
| `src/hooks/use-process-table.ts` | **Create** — TanStack Table hook: column defs, table instance, sort/filter/pagination state, global filter |
| `src/hooks/sort-bridge.ts` | **Create** — Pure sort bridge functions (TanStack `SortingState` ↔ HeroUI `SortDescriptor`) |
| `src/components/process-table.tsx` | **Modify** — Rewrite to render from TanStack Table rows, wire up sort descriptors, pagination footer, and SearchField |
| `src/components/process-row.tsx` | **Delete** — Replaced by inline rendering in process-table.tsx + helpers |
| `src/components/process-table-helpers.tsx` | **Create** — StatusChip and ActionButtons extracted from process-row.tsx, preserving UX (Chip, Tooltip) |
| `src/components/sortable-header.tsx` | **Create** — Reusable sortable column header component bridging TanStack sort state to HeroUI |
| `src/hooks/sort-bridge.test.ts` | **Create** — Tests for pure sort bridge functions |
| `src/hooks/use-process-table.test.ts` | **Create** — Tests for the useProcessTable hook |

---

### Task 1: Create the sort bridge utilities

**Files:**
- Create: `src/hooks/sort-bridge.ts`
- Create: `src/hooks/sort-bridge.test.ts`

These are pure functions that convert between TanStack's `SortingState` and HeroUI's `SortDescriptor`. They handle edge cases like empty sort state and undefined direction (third click to clear sort). No React rendering needed for tests.

- [ ] **Step 1: Write the failing tests for sort bridge**

```ts
// src/hooks/sort-bridge.test.ts
import { describe, it, expect } from 'vitest'
import { toSortDescriptor, toSortingState } from './sort-bridge'
import type { SortingState } from '@tanstack/react-table'

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
    // React Aria passes undefined direction at runtime when sort is cleared,
    // even though TypeScript types say direction is always 'ascending' | 'descending'
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/sort-bridge.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the sort bridge implementation**

```ts
// src/hooks/sort-bridge.ts
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
  // Guard: React Aria may pass undefined direction when sort is cleared at runtime
  if (!descriptor.direction) return []
  return [{ id: String(descriptor.column), desc: descriptor.direction === 'descending' }]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/sort-bridge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/sort-bridge.ts src/hooks/sort-bridge.test.ts
git commit -m "feat: add sort bridge utilities for TanStack ↔ HeroUI conversion"
```

---

### Task 2: Create the `useProcessTable` hook

**Files:**
- Create: `src/hooks/use-process-table.ts`
- Create: `src/hooks/use-process-table.test.ts`

This hook owns all table state: column definitions, sorting, global filter, and pagination. It accepts the processes data from `useProcesses` and returns everything the table component needs. Page size is set to 15 from the start.

Since `@testing-library/react` is not installed, we test the hook indirectly via a simple React component wrapper using Vitest's built-in jsdom environment.

- [ ] **Step 1: Install @testing-library/react as a dev dependency**

Run: `pnpm add -D @testing-library/react`
(Note: needed for `renderHook` in hook tests)

- [ ] **Step 2: Write the failing tests for useProcessTable**

```ts
// src/hooks/use-process-table.test.ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/hooks/use-process-table.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the useProcessTable hook**

```ts
// src/hooks/use-process-table.ts
import { useState, useMemo } from 'react'
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
  type FilterFn,
} from '@tanstack/react-table'
import type { Process } from '../types/process'

const columnHelper = createColumnHelper<Process>()

const globalFilterFn: FilterFn<Process> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase()
  const p = row.original
  return (
    p.name.toLowerCase().includes(search) ||
    p.status.toLowerCase().includes(search) ||
    p.working_directory.toLowerCase().includes(search) ||
    (p.pid != null && String(p.pid).includes(search))
  )
}

export function useProcessTable(processes: Process[]) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<Process, unknown>[]>(
    () =>
      [
        columnHelper.accessor('name', {
          header: 'Name',
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor('pid', {
          header: 'PID',
          cell: (info) => info.getValue() ?? '-',
        }),
        columnHelper.accessor('status', {
          header: 'Status',
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor('working_directory', {
          header: 'Directory',
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor('memory_bytes', {
          header: 'Memory',
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor('uptime_secs', {
          header: 'Uptime',
          cell: (info) => info.getValue(),
        }),
      ] as ColumnDef<Process, unknown>[],
    [],
  )

  const table = useReactTable({
    data: processes,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
    initialState: {
      pagination: { pageSize: 15 },
    },
  })

  return { table, globalFilter, setGlobalFilter }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/use-process-table.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-process-table.ts src/hooks/use-process-table.test.ts
git commit -m "feat: add useProcessTable hook with sorting, filtering, and pagination"
```

---

### Task 3: Create the `SortableHeader` component

**Files:**
- Create: `src/components/sortable-header.tsx`

SortableHeader renders column header text with a sort direction indicator arrow. It receives `sortDirection` from HeroUI's `Table.Column` render-prop pattern.

- [ ] **Step 1: Create the SortableHeader component**

```tsx
// src/components/sortable-header.tsx
import { cn } from '@heroui/react'

interface SortableHeaderProps {
  children: React.ReactNode
  sortDirection?: 'ascending' | 'descending'
}

export function SortableHeader({ children, sortDirection }: SortableHeaderProps) {
  return (
    <span className="flex items-center justify-between">
      {children}
      {sortDirection && (
        <span
          className={cn(
            'inline-block size-3 transition-transform duration-100',
            sortDirection === 'descending' ? 'rotate-180' : '',
          )}
        >
          ▲
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sortable-header.tsx
git commit -m "feat: add SortableHeader component for table column headers"
```

---

### Task 4: Create `StatusChip` and `ActionButtons` helper components

**Files:**
- Create: `src/components/process-table-helpers.tsx`

These are extracted from the existing `process-row.tsx`. We keep them as separate components for readability, preserving the HeroUI `Chip` and `Tooltip` UX from the original code. Static imports for Tauri APIs (matching existing pattern in `process-row.tsx`).

- [ ] **Step 1: Create the helper components**

```tsx
// src/components/process-table-helpers.tsx
import { Chip, Button, Tooltip } from '@heroui/react'
import { Play, Stop, ArrowRotateRight, TrashBin, TextAlignLeft } from '@gravity-ui/icons'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { Process, ProcessStatus } from '../types/process'

export function StatusChip({ status, hasError }: { status: ProcessStatus; hasError: boolean }) {
  const color = status === 'running' ? 'success' : status === 'crashed' ? 'danger' : status === 'completed' ? 'default' : 'warning'
  return (
    <div className="flex gap-1 items-center">
      <Chip color={color} variant="soft" size="sm">
        {status}
      </Chip>
      {hasError && (
        <Chip color="danger" variant="soft" size="sm">
          error
        </Chip>
      )}
    </div>
  )
}

interface ActionButtonsProps {
  process: Process
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onDelete: () => void
}

export function ActionButtons({ process, onStart, onStop, onRestart, onDelete }: ActionButtonsProps) {
  const isRunning = process.status === 'running'

  async function handleViewLog() {
    const mainWindow = getCurrentWindow()
    const webview = new WebviewWindow(`log-${process.id}`, {
      url: '/',
      title: `Log - ${process.name}`,
      width: 800,
      height: 500,
      parent: mainWindow.label,
    })
    webview.once('tauri://error', (e) => {
      console.error('Failed to create log window:', e)
    })
  }

  return (
    <div className="flex gap-1">
      {isRunning ? (
        <Tooltip delay={0}>
          <Button onPress={onStop} isIconOnly size="sm" variant="secondary">
            <Stop />
          </Button>
          <Tooltip.Content>
            <p>Stop</p>
          </Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip delay={0}>
          <Button onPress={onStart} isDisabled={isRunning} isIconOnly size="sm" variant="secondary">
            <Play />
          </Button>
          <Tooltip.Content>
            <p>Start</p>
          </Tooltip.Content>
        </Tooltip>
      )}

      <Tooltip delay={0}>
        <Button
          onPress={onRestart}
          isDisabled={!isRunning}
          isIconOnly
          size="sm"
          variant="secondary"
        >
          <ArrowRotateRight />
        </Button>
        <Tooltip.Content>
          <p>Restart</p>
        </Tooltip.Content>
      </Tooltip>

      <Tooltip delay={0}>
        <Button onPress={onDelete} isIconOnly size="sm" variant="danger-soft">
          <TrashBin />
        </Button>
        <Tooltip.Content>
          <p>Delete</p>
        </Tooltip.Content>
      </Tooltip>

      <Tooltip delay={0}>
        <Button onPress={handleViewLog} isIconOnly size="sm" variant="tertiary">
          <TextAlignLeft />
        </Button>
        <Tooltip.Content>
          <p>View Log</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/process-table-helpers.tsx
git commit -m "feat: add StatusChip and ActionButtons helper components"
```

---

### Task 5: Rewrite `ProcessTable` with TanStack Table integration

**Files:**
- Modify: `src/components/process-table.tsx`

This is the core task. Replace the current static table rendering with TanStack Table-driven rendering that supports sorting, search (via `SearchField` from `@heroui/react`), and pagination. The `SearchField` component uses `onChange=(value: string) => void` which matches `setGlobalFilter` directly (no event wrapper needed).

Key design decisions:
- Use `SearchField` from `@heroui/react` for the search input (native `onChange` passes a string, no `event.target.value` needed)
- Use `formatMemory` and `formatUptime` from `utils/format` for memory and uptime columns
- Use `StatusChip` from the helpers file for status column rendering
- Use `ActionButtons` from the helpers file for the actions column
- Use `SortableHeader` for table column headers
- Use `toSortDescriptor`/`toSortingState` from the sort bridge for HeroUI ↔ TanStack sort sync
- Pagination uses `table.getState().pagination.pageSize` instead of a hardcoded constant to stay in sync

- [ ] **Step 1: Rewrite process-table.tsx**

```tsx
// src/components/process-table.tsx
import { useMemo } from 'react'
import { Table, Pagination, SearchField, Label } from '@heroui/react'
import { useProcesses } from '../hooks/use-processes'
import { useStartProcess } from '../hooks/use-start-process'
import { useStopProcess } from '../hooks/use-stop-process'
import { useRestartProcess } from '../hooks/use-restart-process'
import { useDeleteProcess } from '../hooks/use-delete-process'
import { useProcessTable } from '../hooks/use-process-table'
import { SortableHeader } from './sortable-header'
import { StatusChip, ActionButtons } from './process-table-helpers'
import { formatMemory, formatUptime } from '../utils/format'
import { toSortDescriptor, toSortingState } from '../hooks/sort-bridge'

export function ProcessTable() {
  const { data: processes, isLoading, error } = useProcesses()
  const startMutation = useStartProcess()
  const stopMutation = useStopProcess()
  const restartMutation = useRestartProcess()
  const deleteMutation = useDeleteProcess()

  const allProcesses = processes ?? []

  const { table, globalFilter, setGlobalFilter } = useProcessTable(allProcesses)

  const sorting = table.getState().sorting
  const sortDescriptor = useMemo(() => toSortDescriptor(sorting), [sorting])

  const handleSortChange = (descriptor: Parameters<typeof toSortingState>[0]) => {
    table.setSorting(toSortingState(descriptor))
  }

  const pageSize = table.getState().pagination.pageSize
  const { pageIndex } = table.getState().pagination
  const pageCount = table.getPageCount()
  const totalRows = table.getFilteredRowModel().rows.length
  const start = Math.min(pageIndex * pageSize + 1, totalRows)
  const end = Math.min((pageIndex + 1) * pageSize, totalRows)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-3">
      <SearchField name="process-search" value={globalFilter} onChange={setGlobalFilter}>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search processes..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Processes table"
            sortDescriptor={sortDescriptor}
            onSortChange={handleSortChange}
            className="min-w-[900px]"
          >
            <Table.Header>
              {headerGroups[0].headers.map((header) => (
                <Table.Column
                  key={header.id}
                  id={header.id}
                  allowsSorting={header.column.getCanSort()}
                  isRowHeader={header.id === 'name'}
                >
                  {({ sortDirection }: { sortDirection?: 'ascending' | 'descending' }) => (
                    <SortableHeader sortDirection={sortDirection}>
                      {header.column.columnDef.header as string}
                    </SortableHeader>
                  )}
                </Table.Column>
              ))}
              <Table.Column>Actions</Table.Column>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => {
                const process = row.original
                return (
                  <Table.Row key={process.id} id={process.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id}>
                        {cell.column.id === 'memory_bytes'
                          ? formatMemory(cell.getValue() as number | null)
                          : cell.column.id === 'uptime_secs'
                            ? formatUptime(cell.getValue() as number | null)
                            : cell.column.id === 'pid'
                              ? (cell.getValue() as number | null) ?? '-'
                              : cell.column.id === 'status'
                                ? <StatusChip status={process.status} hasError={!!process.error_message} />
                                : String(cell.getValue() ?? '')}
                      </Table.Cell>
                    ))}
                    <Table.Cell>
                      <ActionButtons
                        process={process}
                        onStart={() => startMutation.mutate(process.id)}
                        onStop={() => stopMutation.mutate(process.id)}
                        onRestart={() => restartMutation.mutate(process.id)}
                        onDelete={() => deleteMutation.mutate(process.id)}
                      />
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        {totalRows > pageSize && (
          <Table.Footer>
            <Pagination size="sm">
              <Pagination.Summary>
                {start} to {end} of {totalRows} results
              </Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={!table.getCanPreviousPage()}
                    onPress={() => table.previousPage()}
                  >
                    <Pagination.PreviousIcon />
                    Prev
                  </Pagination.Previous>
                </Pagination.Item>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <Pagination.Item key={p}>
                    <Pagination.Link
                      isActive={p === pageIndex + 1}
                      onPress={() => table.setPageIndex(p - 1)}
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ))}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={!table.getCanNextPage()}
                    onPress={() => table.nextPage()}
                  >
                    Next
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          </Table.Footer>
        )}
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Run the TypeScript compiler to check for type errors**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/process-table.tsx
git commit -m "feat: rewrite ProcessTable with TanStack Table for sorting, search, and pagination"
```

---

### Task 6: Delete the old `ProcessRow` component

**Files:**
- Delete: `src/components/process-row.tsx`

The `ProcessRow` component is no longer imported. All rendering is handled by `ProcessTable` + `process-table-helpers.tsx`.

- [ ] **Step 1: Verify nothing imports process-row.tsx**

Run: `rg "process-row" src/ --include-glob "*.ts" --include-glob "*.tsx"`
Expected: No results (the rewrite removed the import)

- [ ] **Step 2: Delete process-row.tsx**

Run: `Remove-Item src/components/process-row.tsx`

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove ProcessRow component (replaced by TanStack Table row rendering)"
```

---

### Task 7: Final verification — build and manual testing

**Files:**
- Potentially modify any file if issues are found

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run Vite build to verify compilation**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Run the dev server and manually verify**

Run: `npx vite dev`

Verify in browser:
1. Table renders with process data
2. Clicking column headers sorts ascending → descending → clears (3-state cycle)
3. Typing in the search input filters rows by name, status, directory, pid
4. Clearing search restores all rows (via SearchField.ClearButton)
5. Pagination footer appears when >15 processes
6. Start/Stop/Restart/Delete/View Log buttons work with tooltips
7. Status chips render with correct colors matching original
8. Empty table shows no errors when no processes match search

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration issues found during final verification"
```