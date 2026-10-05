import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buildPath } from '@/config/routes'
import { formatCalendarDate, formatDateTime } from '@/lib/date'
import type { ManagedUser } from '@/types/users'
import { AccountStatusBadge } from './AccountStatusBadge'
import { RoleBadge } from './RoleBadge'

export function UsersTable({ users }: { users: ManagedUser[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Date of birth</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Registered</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              <Link
                to={buildPath.adminUserDetail(user.id)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {user.firstName} {user.lastName}
              </Link>
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{formatCalendarDate(user.dateOfBirth)}</TableCell>
            <TableCell>
              <RoleBadge role={user.role} />
            </TableCell>
            <TableCell>{formatDateTime(user.createdAt)}</TableCell>
            <TableCell>
              <AccountStatusBadge status={user.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
