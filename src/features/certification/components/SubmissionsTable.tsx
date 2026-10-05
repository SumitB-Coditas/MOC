import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/date'
import type { SubmissionSummary } from '../certificationService'
import { purposeLabel } from '../labels'

interface SubmissionsTableProps {
  submissions: SubmissionSummary[]
  hrefFor: (submission: SubmissionSummary) => string
  showApplicant?: boolean
}

export function SubmissionsTable({ submissions, hrefFor, showApplicant }: SubmissionsTableProps) {
  if (submissions.length === 0) {
    return <p className="text-sm text-muted-foreground">No submissions yet.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showApplicant && <TableHead>Applicant</TableHead>}
          <TableHead>Type</TableHead>
          <TableHead>Certificate number</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Timing</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => (
          <TableRow key={submission.id}>
            {showApplicant && (
              <TableCell className="font-medium">{submission.applicantName}</TableCell>
            )}
            <TableCell>{purposeLabel(submission.purpose, submission.cycleNumber)}</TableCell>
            <TableCell className="font-mono text-xs">{submission.certificateNumber}</TableCell>
            <TableCell>{formatDateTime(submission.submittedAt)}</TableCell>
            <TableCell>
              {submission.purpose === 'INITIAL' ? (
                <span className="text-muted-foreground">-</span>
              ) : submission.isLate ? (
                <Badge variant="warning">Late</Badge>
              ) : (
                <Badge variant="success">On time</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Link
                to={hrefFor(submission)}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View
                <span className="sr-only">
                  {' '}
                  {purposeLabel(submission.purpose, submission.cycleNumber)} submitted{' '}
                  {formatDateTime(submission.submittedAt)}
                </span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
