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
import { toSortDescriptor } from '../hooks/sort-bridge'
import type { SortDescriptor } from '../hooks/sort-bridge'

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

  const handleSortChange = (descriptor: SortDescriptor) => {
    const currentSort = sorting[0]
    const clickedColumn = String(descriptor.column)

    if (!currentSort || currentSort.id !== clickedColumn) {
      table.setSorting([{ id: clickedColumn, desc: false }])
    } else if (!currentSort.desc) {
      table.setSorting([{ id: clickedColumn, desc: true }])
    } else {
      table.setSorting([])
    }
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
            <Table.Body renderEmptyState={() => <div className="py-6 text-center text-muted-foreground">No Process Found</div>}>
              {rows.length > 0 && rows.map((row) => {
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