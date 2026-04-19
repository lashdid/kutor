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