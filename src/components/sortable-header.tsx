import { ChevronUp, ChevronDown } from '@gravity-ui/icons'

interface SortableHeaderProps {
  children: React.ReactNode
  sortDirection?: 'ascending' | 'descending'
}

export function SortableHeader({ children, sortDirection }: SortableHeaderProps) {
  const isSorted = !!sortDirection
  return (
    <span className="flex items-center justify-between gap-1 group/sort cursor-pointer select-none">
      {children}
      <span
        className={`flex flex-col transition-opacity ${
          isSorted ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-60'
        }`}
      >
        <ChevronUp
          width={12}
          height={12}
          className={sortDirection === 'ascending' ? 'text-foreground' : 'text-foreground/30'}
        />
        <ChevronDown
          width={12}
          height={12}
          className={sortDirection === 'descending' ? 'text-foreground' : 'text-foreground/30'}
        />
      </span>
    </span>
  )
}