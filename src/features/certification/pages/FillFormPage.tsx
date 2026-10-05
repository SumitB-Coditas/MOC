import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CircleCheck, CircleX, Info, Save, Send } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { HOME_PATH_BY_ROLE } from '@/config/routes'
import { useAuth } from '@/features/auth/useAuth'
import { buildSubmitSchema, initialFormValues } from '@/domain/forms/buildFormSchema'
import { formatCalendarDate, formatDateTime } from '@/lib/date'
import { getErrorMessage, isAppError } from '@/lib/errors'
import type { FormValues } from '@/types/forms'
import type { AssignmentFormData } from '../certificationService'
import { CertificateFormFields } from '../components/CertificateFormFields'
import { ReadOnlyFormView } from '../components/ReadOnlyFormView'
import { AssignmentStatusBadge } from '../components/StatusBadges'
import { useAssignmentForm } from '../hooks'
import { purposeLabel } from '../labels'
import { useCertificationService } from '../serviceContext'

type Feedback = { variant: 'success' | 'destructive'; message: string }

function BackToDashboard() {
  const { user } = useAuth()
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to={user ? HOME_PATH_BY_ROLE[user.role] : '/'}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Dashboard
      </Link>
    </Button>
  )
}

export function FillFormPage() {
  const { assignmentId = '' } = useParams()
  const { data, error, status } = useAssignmentForm(assignmentId)

  if (status === 'error' && !data) {
    return (
      <div className="space-y-4">
        <BackToDashboard />
        <Alert variant="destructive">
          <AlertTitle>This form could not be opened</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      </div>
    )
  }
  if (!data) return <LoadingIndicator layout="block" label="Loading form…" />

  // Keyed so a different assignment re-initialises the form.
  return <AssignmentFormScreen key={data.assignment.id} data={data} />
}

function AssignmentFormScreen({ data }: { data: AssignmentFormData }) {
  const { assignment, form, values, applicant, isEditable } = data
  const title = `${form.title}: ${purposeLabel(assignment.purpose, assignment.cycleNumber)}`

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <PageHeader
        title={title}
        description={form.description}
        actions={<AssignmentStatusBadge status={assignment.effectiveStatus} />}
      />

      {assignment.cycle && isEditable && (
        <Alert variant={assignment.cycle.state === 'IN_GRACE' ? 'warning' : 'info'}>
          <Info />
          <AlertDescription>
            {assignment.cycle.state === 'IN_GRACE'
              ? `This renewal was due on ${formatCalendarDate(assignment.cycle.dueDate)} and will be recorded as late. It must be submitted before ${formatCalendarDate(assignment.cycle.graceEnds)}. Your renewal schedule stays the same.`
              : `This renewal is due on ${formatCalendarDate(assignment.cycle.dueDate)}.`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Applicant</h2>
          </CardTitle>
          <CardDescription>
            From your profile. Contact the administrator to change it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            {[
              ['Name', `${applicant.firstName} ${applicant.lastName}`],
              ['Email', applicant.email],
              ['Date of birth', formatCalendarDate(applicant.dateOfBirth)],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {isEditable ? (
        <EditableForm data={data} />
      ) : (
        <>
          <ReadOnlyNotice data={data} />
          <Card>
            <CardContent>
              <ReadOnlyFormView form={form} values={values} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function ReadOnlyNotice({ data: { assignment } }: { data: AssignmentFormData }) {
  const notice = {
    SUBMITTED: {
      variant: 'success' as const,
      text: `Submitted on ${formatDateTime(assignment.submittedAt ?? '')}. Submitted forms are read-only.`,
    },
    EXPIRED: {
      variant: 'destructive' as const,
      text: 'This renewal can no longer be submitted because its grace period has ended.',
    },
    CANCELLED: {
      variant: 'default' as const,
      text: 'This assignment was cancelled by the administrator.',
    },
    ASSIGNED: { variant: 'default' as const, text: '' },
    DRAFT: { variant: 'default' as const, text: '' },
  }[assignment.effectiveStatus]
  return (
    <Alert variant={notice.variant}>
      <Info />
      <AlertDescription>{notice.text}</AlertDescription>
    </Alert>
  )
}

function EditableForm({ data }: { data: AssignmentFormData }) {
  const { assignment, form, values } = data
  const service = useCertificationService()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<Feedback>()
  const [pendingSubmit, setPendingSubmit] = useState<FormValues>()
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const leavingAfterSubmit = useRef(false)

  const resolver = useMemo(
    () => zodResolver(buildSubmitSchema(form) as never) as unknown as Resolver<FormValues>,
    [form],
  )
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver,
    mode: 'onTouched',
    defaultValues: initialFormValues(form, values),
  })

  // Warn before leaving with unsaved changes.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !leavingAfterSubmit.current && currentLocation.pathname !== nextLocation.pathname,
  )

  async function saveDraft() {
    setIsSaving(true)
    setFeedback(undefined)
    try {
      const current = getValues()
      const saved = await service.saveDraft(assignment.id, current)
      reset(current) // the saved values become the new baseline (not dirty)
      setFeedback({
        variant: 'success',
        message: `Draft saved ${formatDateTime(saved.draft?.savedAt ?? '')}. You can come back and finish later.`,
      })
    } catch (saveError) {
      setFeedback({ variant: 'destructive', message: getErrorMessage(saveError) })
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmSubmit() {
    if (!pendingSubmit) return
    setIsSubmitting(true)
    setFeedback(undefined)
    try {
      const result = await service.submit(assignment.id, pendingSubmit)
      leavingAfterSubmit.current = true
      await refresh() // the role may have changed (Candidate → Diplomate)
      navigate(HOME_PATH_BY_ROLE[result.status.role], {
        replace: true,
        state: {
          flash:
            assignment.purpose === 'INITIAL'
              ? 'Application submitted. You are now a Diplomate.'
              : `Renewal ${assignment.cycleNumber} submitted${result.submission.isLate ? ' (late)' : ''}. Your Diplomate status continues.`,
        },
      })
    } catch (submitError) {
      const fieldErrors = isAppError(submitError) ? (submitError.fieldErrors ?? {}) : {}
      Object.entries(fieldErrors).forEach(([field, message]) => setError(field, { message }))
      setFeedback({ variant: 'destructive', message: getErrorMessage(submitError) })
    } finally {
      setIsSubmitting(false)
      setPendingSubmit(undefined)
    }
  }

  const busy = isSaving || isSubmitting

  return (
    <form
      noValidate
      aria-label="Certificate form"
      className="space-y-6"
      onSubmit={handleSubmit((valid) => setPendingSubmit(valid))}
    >
      <div aria-live="polite">
        {feedback && (
          <Alert variant={feedback.variant}>
            {feedback.variant === 'success' ? <CircleCheck /> : <CircleX />}
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <Card>
        <CardContent>
          <CertificateFormFields form={form} register={register} errors={errors} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={saveDraft} disabled={busy}>
          {isSaving ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : (
            <Save data-icon="inline-start" aria-hidden="true" />
          )}
          {isSaving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button type="submit" disabled={busy}>
          {isSubmitting ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : (
            <Send data-icon="inline-start" aria-hidden="true" />
          )}
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </Button>
      </div>

      <AlertDialog
        open={pendingSubmit !== undefined && !isSubmitting}
        onOpenChange={(open) => !open && setPendingSubmit(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this form?</AlertDialogTitle>
            <AlertDialogDescription>
              Submitted forms cannot be changed. Check your answers before submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Save a draft first to keep them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Stay</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
