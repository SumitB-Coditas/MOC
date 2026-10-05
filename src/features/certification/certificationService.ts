import { ADMIN_ACCOUNT } from '@/config/admin'
import {
  assignmentEligibility,
  effectiveAssignmentStatus,
  type AssignmentEligibility,
} from '@/domain/certification/assignmentRules'
import { evaluateCertification } from '@/domain/certification/engine'
import { CERTIFICATE_APPLICATION_FORM } from '@/domain/forms/certificateApplicationForm'
import { buildDraftSchema, buildSubmitSchema } from '@/domain/forms/buildFormSchema'
import { formatCalendarDate } from '@/lib/date'
import { AppError } from '@/lib/errors'
import { createId } from '@/lib/id'
import { toFieldErrors } from '@/lib/validation'
import { currentActorId, requireAdmin, requireMember } from '@/services/authorization'
import { appClock, createClock, type Clock } from '@/services/clock'
import { assignmentsCollection } from '@/services/repositories/assignments'
import { formsCollection } from '@/services/repositories/forms'
import { submissionsCollection } from '@/services/repositories/submissions'
import { usersCollection } from '@/services/repositories/users'
import { storage as appStorage, type StorageClient } from '@/services/storage'
import type { UserRecord } from '@/types/auth'
import type {
  CertificationStatus,
  EffectiveAssignmentStatus,
  FormAssignment,
  RenewalCycle,
  Submission,
} from '@/types/certification'
import type { FormDefinition, FormValues } from '@/types/forms'

export interface AssignmentView extends FormAssignment {
  effectiveStatus: EffectiveAssignmentStatus
  formTitle: string
  /** RENEWAL: the cycle being renewed, with its dates and state. */
  cycle?: RenewalCycle
}

export interface SubmissionSummary {
  id: string
  userId: string
  applicantName: string
  purpose: Submission['purpose']
  periodId: string
  cycleNumber: number
  submittedAt: string
  submittedOnDate: string
  isLate: boolean
  certificateNumber: string
}

export interface MemberCertification {
  status: CertificationStatus
  assignments: AssignmentView[]
  submissions: SubmissionSummary[]
}

export interface AdminUserCertification extends MemberCertification {
  eligibility: AssignmentEligibility
}

export interface AssignmentFormData {
  assignment: AssignmentView
  /** For a submitted assignment, the snapshot the user actually submitted. */
  form: FormDefinition
  values: FormValues | undefined
  applicant: Submission['applicantSnapshot']
  isEditable: boolean
}

export interface SubmitResult {
  submission: Submission
  status: CertificationStatus
}

/**
 * Form assignment, drafting, submission and certification history. Every method checks
 * the session itself (Admin or owning member), as a backend would.
 */
export interface CertificationService {
  // Candidate / Diplomate
  getMyCertification(): Promise<MemberCertification>
  getAssignmentForm(assignmentId: string): Promise<AssignmentFormData>
  saveDraft(assignmentId: string, values: FormValues): Promise<AssignmentView>
  submit(assignmentId: string, values: FormValues): Promise<SubmitResult>
  // Admin
  getUserCertification(userId: string): Promise<AdminUserCertification>
  assignForm(userId: string): Promise<AssignmentView>
  cancelAssignment(assignmentId: string): Promise<AssignmentView>
  listSubmissions(): Promise<SubmissionSummary[]>
  // Admin or the submission's owner
  getSubmission(submissionId: string): Promise<Submission>
}

const ELIGIBILITY_MESSAGES = {
  INACTIVE_USER: () => 'Inactive users cannot be assigned forms.',
  OPEN_ASSIGNMENT: () => 'This user already has an open assignment.',
  RENEWAL_NOT_OPEN: (opensOn?: string) =>
    opensOn
      ? `No renewal is due yet. The next renewal window opens on ${formatCalendarDate(opensOn)}.`
      : 'No renewal is due yet.',
}

export function eligibilityMessage(eligibility: AssignmentEligibility): string | undefined {
  return eligibility.canAssign
    ? undefined
    : ELIGIBILITY_MESSAGES[eligibility.reason](eligibility.opensOn)
}

const isOpenStatus = (status: EffectiveAssignmentStatus) =>
  status === 'ASSIGNED' || status === 'DRAFT'

function toSummary(submission: Submission): SubmissionSummary {
  const { firstName, lastName } = submission.applicantSnapshot
  return {
    id: submission.id,
    userId: submission.userId,
    applicantName: `${firstName} ${lastName}`,
    purpose: submission.purpose,
    periodId: submission.periodId,
    cycleNumber: submission.cycleNumber,
    submittedAt: submission.submittedAt,
    submittedOnDate: submission.submittedOnDate,
    isLate: submission.isLate,
    certificateNumber: String(submission.values.certificateNumber ?? ''),
  }
}

const newestFirst = <T extends { submittedAt: string }>(a: T, b: T) =>
  b.submittedAt.localeCompare(a.submittedAt)

interface CertificationServiceDeps {
  storage: StorageClient
  clock?: Clock
}

export function createCertificationService({
  storage,
  clock = createClock(storage),
}: CertificationServiceDeps): CertificationService {
  const users = () => usersCollection.repository(storage)
  const forms = () => formsCollection.repository(storage)
  const assignments = () => assignmentsCollection.repository(storage)
  const submissions = () => submissionsCollection.repository(storage)

  function toView(assignment: FormAssignment, status: CertificationStatus): AssignmentView {
    const cycle =
      assignment.purpose === 'RENEWAL'
        ? status.periods
            .find((period) => period.periodId === assignment.periodId)
            ?.cycles.find((candidate) => candidate.cycleNumber === assignment.cycleNumber)
        : undefined
    return {
      ...assignment,
      effectiveStatus: effectiveAssignmentStatus(assignment, status),
      formTitle: forms().findById(assignment.formDefinitionId)?.title ?? 'Certificate form',
      ...(cycle ? { cycle } : {}),
    }
  }

  /** Everything about one user's certification, evaluated as of today. */
  function loadUser(userId: string): MemberCertification {
    const userSubmissions = submissions().filter((submission) => submission.userId === userId)
    const status = evaluateCertification(userSubmissions, clock.today())
    return {
      status,
      assignments: assignments()
        .filter((assignment) => assignment.userId === userId)
        .map((assignment) => toView(assignment, status))
        .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)),
      submissions: userSubmissions.map(toSummary).sort(newestFirst),
    }
  }

  function ownedAssignment(member: UserRecord, assignmentId: string) {
    const assignment = assignments().findById(assignmentId)
    // Someone else's assignment is reported as missing, revealing nothing.
    if (!assignment || assignment.userId !== member.id) {
      throw new AppError('NOT_FOUND', 'Assignment not found.')
    }
    const { status } = loadUser(member.id)
    return { assignment, status, view: toView(assignment, status) }
  }

  function assertEditable(view: AssignmentView) {
    if (!isOpenStatus(view.effectiveStatus)) {
      throw new AppError(
        'CONFLICT',
        view.effectiveStatus === 'EXPIRED'
          ? 'This renewal can no longer be submitted: its grace period has ended.'
          : 'This form can no longer be edited.',
      )
    }
  }

  function formFor(assignment: FormAssignment): FormDefinition {
    const form = forms().findById(assignment.formDefinitionId)
    if (!form) throw new AppError('NOT_FOUND', 'The certificate form could not be found.')
    return form
  }

  return {
    async getMyCertification() {
      return loadUser(requireMember(storage).id)
    },

    async getAssignmentForm(assignmentId) {
      const member = requireMember(storage)
      const { assignment, view } = ownedAssignment(member, assignmentId)
      const submission = assignment.submissionId
        ? submissions().findById(assignment.submissionId)
        : undefined
      const { firstName, lastName, email, dateOfBirth } = member
      return {
        assignment: view,
        form: submission?.formSnapshot ?? formFor(assignment),
        values: submission?.values ?? assignment.draft?.values,
        applicant: submission?.applicantSnapshot ?? { firstName, lastName, email, dateOfBirth },
        isEditable: isOpenStatus(view.effectiveStatus),
      }
    },

    async saveDraft(assignmentId, values) {
      const member = requireMember(storage)
      const { assignment, status, view } = ownedAssignment(member, assignmentId)
      assertEditable(view)

      const parsed = buildDraftSchema(formFor(assignment)).safeParse(values)
      if (!parsed.success) throw new AppError('VALIDATION', 'The draft contains invalid values.')

      const timestamp = clock.now().toISOString()
      const updated = assignments().update(assignmentId, {
        status: 'DRAFT',
        draft: { values: parsed.data, savedAt: timestamp },
        updatedAt: timestamp,
      })
      return toView(updated, status)
    },

    async submit(assignmentId, values) {
      const member = requireMember(storage)
      const { assignment, status, view } = ownedAssignment(member, assignmentId)
      assertEditable(view)

      const form = formFor(assignment)
      const parsed = buildSubmitSchema(form).safeParse(values)
      if (!parsed.success) {
        const { fieldErrors } = toFieldErrors(parsed.error)
        throw new AppError('VALIDATION', 'Please complete the highlighted fields.', {
          fieldErrors,
        })
      }

      // Re-check against the certification state as of today.
      const today = clock.today()
      let periodId: string
      let cycleNumber = 0
      let isLate = false
      const submissionId = createId()
      if (assignment.purpose === 'INITIAL') {
        if (status.role !== 'CANDIDATE') {
          throw new AppError('CONFLICT', 'You are already certified.')
        }
        periodId = submissionId
      } else {
        const open = status.openRenewal
        if (
          !open ||
          !status.currentPeriod ||
          status.currentPeriod.periodId !== assignment.periodId ||
          open.cycleNumber !== assignment.cycleNumber
        ) {
          throw new AppError('CONFLICT', 'This renewal is not open for submission.')
        }
        periodId = status.currentPeriod.periodId
        cycleNumber = open.cycleNumber
        isLate = today >= open.dueDate
      }

      const timestamp = clock.now().toISOString()
      const { firstName, lastName, email, dateOfBirth } = member
      const submission: Submission = {
        id: submissionId,
        assignmentId,
        userId: member.id,
        purpose: assignment.purpose,
        periodId,
        cycleNumber,
        formSnapshot: form,
        applicantSnapshot: { firstName, lastName, email, dateOfBirth },
        values: parsed.data,
        submittedAt: timestamp,
        submittedOnDate: today,
        isLate,
      }

      // Both writes land together or not at all.
      storage.transaction((tx) => {
        submissionsCollection.repository(tx).insert(submission)
        assignmentsCollection.repository(tx).update(assignmentId, {
          status: 'SUBMITTED',
          submissionId,
          submittedAt: timestamp,
          draft: undefined,
          updatedAt: timestamp,
        })
      })

      return { submission, status: loadUser(member.id).status }
    },

    async getUserCertification(userId) {
      requireAdmin(storage)
      const user = users().findById(userId)
      if (!user) throw new AppError('NOT_FOUND', 'User not found.')
      const data = loadUser(userId)
      return {
        ...data,
        eligibility: assignmentEligibility(
          data.status,
          {
            isActiveUser: !user.deletedAt,
            hasOpenAssignment: data.assignments.some((a) => isOpenStatus(a.effectiveStatus)),
          },
          clock.today(),
        ),
      }
    },

    async assignForm(userId) {
      requireAdmin(storage)
      const user = users().findById(userId)
      if (!user) throw new AppError('NOT_FOUND', 'User not found.')
      const data = loadUser(userId)
      const eligibility = assignmentEligibility(
        data.status,
        {
          isActiveUser: !user.deletedAt,
          hasOpenAssignment: data.assignments.some((a) => isOpenStatus(a.effectiveStatus)),
        },
        clock.today(),
      )
      if (!eligibility.canAssign) {
        throw new AppError('CONFLICT', eligibilityMessage(eligibility) ?? 'Cannot assign.')
      }

      const form = forms().findById(CERTIFICATE_APPLICATION_FORM.id)
      if (!form) throw new AppError('NOT_FOUND', 'The certificate form could not be found.')

      const timestamp = clock.now().toISOString()
      const assignment = assignments().insert({
        id: createId(),
        userId,
        formDefinitionId: form.id,
        formVersion: form.version,
        purpose: eligibility.purpose,
        ...(eligibility.purpose === 'RENEWAL'
          ? { periodId: eligibility.periodId, cycleNumber: eligibility.cycle.cycleNumber }
          : {}),
        status: 'ASSIGNED',
        assignedAt: timestamp,
        updatedAt: timestamp,
      })
      return toView(assignment, data.status)
    },

    async cancelAssignment(assignmentId) {
      requireAdmin(storage)
      const assignment = assignments().findById(assignmentId)
      if (!assignment) throw new AppError('NOT_FOUND', 'Assignment not found.')
      if (assignment.status !== 'ASSIGNED' && assignment.status !== 'DRAFT') {
        throw new AppError('CONFLICT', 'Only assignments that are not submitted can be cancelled.')
      }
      const timestamp = clock.now().toISOString()
      const updated = assignments().update(assignmentId, {
        status: 'CANCELLED',
        cancelledAt: timestamp,
        updatedAt: timestamp,
      })
      return toView(updated, loadUser(assignment.userId).status)
    },

    async listSubmissions() {
      requireAdmin(storage)
      return submissions().list().map(toSummary).sort(newestFirst)
    },

    async getSubmission(submissionId) {
      const submission = submissions().findById(submissionId)
      if (!submission) throw new AppError('NOT_FOUND', 'Submission not found.')
      if (currentActorId(storage) === ADMIN_ACCOUNT.id) {
        requireAdmin(storage)
      } else if (requireMember(storage).id !== submission.userId) {
        throw new AppError('NOT_FOUND', 'Submission not found.')
      }
      return submission
    },
  }
}

export const certificationService = createCertificationService({
  storage: appStorage,
  clock: appClock,
})
