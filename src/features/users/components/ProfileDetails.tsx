import type { ReactNode } from 'react'
import { formatCalendarDate } from '@/lib/date'
import type { ManagedUser } from '@/types/users'

export function DetailList({ items }: { items: Array<[label: string, value: ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="space-y-1">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ProfileDetails({ user }: { user: ManagedUser }) {
  return (
    <DetailList
      items={[
        ['First name', user.firstName],
        ['Last name', user.lastName],
        ['Date of birth', formatCalendarDate(user.dateOfBirth)],
        ['Email', user.email],
      ]}
    />
  )
}
