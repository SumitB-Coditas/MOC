import { BadgeCheck, CalendarClock, CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCalendarDate as date } from '@/lib/date'
import type { CertificationStatus } from '@/types/certification'

interface CertificationStatusCardProps {
  status: CertificationStatus
  /** Extra guidance under the summary (e.g. what the member should do next). */
  children?: ReactNode
}

/** One-glance summary of where a user stands in the certification lifecycle. */
export function CertificationStatusCard({ status, children }: CertificationStatusCardProps) {
  const { phase, currentPeriod, nextRenewal, openRenewal, lapsedOn } = status

  const content = {
    NOT_CERTIFIED: {
      variant: 'default' as const,
      icon: <Info />,
      title: 'Not yet certified',
      text: 'Certification starts on the day the initial application is submitted.',
    },
    ACTIVE: {
      variant: 'success' as const,
      icon: <BadgeCheck />,
      title: 'Certified',
      text: nextRenewal
        ? `Certified since ${date(currentPeriod?.startDate ?? '')}. Renewal ${nextRenewal.cycleNumber} is due on ${date(nextRenewal.dueDate)}; its window opens on ${date(nextRenewal.windowOpens)}.`
        : `Certified since ${date(currentPeriod?.startDate ?? '')}.`,
    },
    RENEWAL_OPEN: {
      variant: 'info' as const,
      icon: <CalendarClock />,
      title: 'Renewal open',
      text: openRenewal
        ? `Renewal ${openRenewal.cycleNumber} is due on ${date(openRenewal.dueDate)}.`
        : '',
    },
    GRACE: {
      variant: 'warning' as const,
      icon: <TriangleAlert />,
      title: 'Renewal overdue: grace period',
      text: openRenewal
        ? `Renewal ${openRenewal.cycleNumber} was due on ${date(openRenewal.dueDate)}. Diplomate status continues during the grace period, which ends on ${date(openRenewal.graceEnds)}. A late renewal keeps the original schedule.`
        : '',
    },
    LAPSED: {
      variant: 'destructive' as const,
      icon: <CircleAlert />,
      title: 'Certification lapsed',
      text: `Certification lapsed on ${date(lapsedOn ?? '')} because a renewal was not completed within the grace period. Past submissions remain in the history. A new initial application starts a new certification period.`,
    },
  }[phase]

  return (
    <Alert variant={content.variant}>
      {content.icon}
      <AlertTitle>{content.title}</AlertTitle>
      <AlertDescription>
        <p>{content.text}</p>
        {children}
      </AlertDescription>
    </Alert>
  )
}
