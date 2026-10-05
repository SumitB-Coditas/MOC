import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

interface StatTileProps {
  label: string
  value: number
  /** Where the tile leads, e.g. the user list filtered to this group. */
  to: string
}

const formatCount = new Intl.NumberFormat('en-GB', { notation: 'compact' }).format

/** KPI tile: sentence-case label and a large value. The whole tile is a link. */
export function StatTile({ label, value, to }: StatTileProps) {
  return (
    <Link
      to={to}
      className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors group-hover:bg-muted/40">
        <div className="flex items-start justify-between gap-2 px-(--card-spacing)">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-heading text-3xl font-semibold">{formatCount(value)}</p>
          </div>
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </Card>
    </Link>
  )
}
