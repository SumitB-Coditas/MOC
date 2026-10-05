import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCalendarDate as date } from '@/lib/date'
import type { CertificationPeriod } from '@/types/certification'
import { CycleStateBadge } from './StatusBadges'

/** Each certification period (newest first) with its renewal cycles and their dates. */
export function CycleTimeline({ periods }: { periods: CertificationPeriod[] }) {
  if (periods.length === 0) {
    return <p className="text-sm text-muted-foreground">No certification periods yet.</p>
  }

  return (
    <div className="space-y-6">
      {[...periods].reverse().map((period) => (
        <section key={period.periodId} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">Certified from {date(period.startDate)}</h3>
            {period.endedOn ? (
              <Badge variant="destructive">Lapsed {date(period.endedOn)}</Badge>
            ) : (
              <Badge variant="success">Current</Badge>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Renewal</TableHead>
                <TableHead>Window opens</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Grace ends</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {period.cycles.map((cycle) => (
                <TableRow key={cycle.cycleNumber}>
                  <TableCell>Renewal {cycle.cycleNumber}</TableCell>
                  <TableCell>{date(cycle.windowOpens)}</TableCell>
                  <TableCell>{date(cycle.dueDate)}</TableCell>
                  <TableCell>{date(cycle.graceEnds)}</TableCell>
                  <TableCell>
                    <CycleStateBadge state={cycle.state} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  )
}
