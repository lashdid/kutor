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