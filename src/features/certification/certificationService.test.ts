import { beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@/lib/errors'
import { submissionsCollection } from '@/services/repositories/submissions'
import {
  COMPLETE_APPLICATION,
  createCertificationTestContext,
} from './testing/createCertificationTestContext'

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => {
      throw new Error('Expected rejection')
    },
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(AppError)
  return error as AppError
}

const EMAIL = 'jane@example.com'

describe('certification workflow (service level)', () => {
  let ctx: ReturnType<typeof createCertificationTestContext>
  let userId: string

  beforeEach(async () => {
    ctx = createCertificationTestContext('2026-03-15')
    userId = (await ctx.registerCandidate(EMAIL)).id
  })

  it('assign → draft → resume → submit turns a Candidate into a Diplomate', async () => {
    await ctx.asAdmin()
    const assigned = await ctx.certification.assignForm(userId)
    expect(assigned).toMatchObject({ purpose: 'INITIAL', effectiveStatus: 'ASSIGNED' })

    await ctx.asMember(EMAIL)
    const draft = await ctx.certification.saveDraft(assigned.id, { certificateNumber: 'CERT-1' })
    expect(draft.effectiveStatus).toBe('DRAFT')

    // Leave and come back later: the draft is restored.
    const resumed = await ctx.certification.getAssignmentForm(assigned.id)
    expect(resumed).toMatchObject({ isEditable: true, values: { certificateNumber: 'CERT-1' } })

    // Incomplete submit is rejected with field errors and changes nothing.
    const invalid = await rejection(
      ctx.certification.submit(assigned.id, { certificateNumber: 'CERT-1' }),
    )
    expect(invalid.code).toBe('VALIDATION')
    expect(invalid.fieldErrors).toHaveProperty('courseValidFrom')

    const { submission, status } = await ctx.certification.submit(assigned.id, COMPLETE_APPLICATION)
    expect(submission).toMatchObject({ purpose: 'INITIAL', cycleNumber: 0, isLate: false })
    expect(submission.periodId).toBe(submission.id)
    expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'ACTIVE' })
    expect(status.nextRenewal?.dueDate).toBe('2029-03-15')

    // The session re-derives the role, and the submitted form is read-only.
    expect((await ctx.auth.restoreSession())?.role).toBe('DIPLOMATE')
    const submitted = await ctx.certification.getAssignmentForm(assigned.id)
    expect(submitted).toMatchObject({ isEditable: false, values: COMPLETE_APPLICATION })
    expect((await rejection(ctx.certification.saveDraft(assigned.id, {}))).code).toBe('CONFLICT')
  })

  it('blocks a second open assignment and renewals before their window', async () => {
    await ctx.asAdmin()
    await ctx.certification.assignForm(userId)
    expect((await rejection(ctx.certification.assignForm(userId))).message).toBe(
      'This user already has an open assignment.',
    )

    const { eligibility } = await ctx.certification.getUserCertification(userId)
    expect(eligibility).toMatchObject({ canAssign: false, reason: 'OPEN_ASSIGNMENT' })

    const [open] = (await ctx.certification.getUserCertification(userId)).assignments
    await ctx.asMember(EMAIL)
    await ctx.certification.submit(open!.id, COMPLETE_APPLICATION)

    await ctx.asAdmin()
    expect((await ctx.certification.getUserCertification(userId)).eligibility).toMatchObject({
      canAssign: false,
      reason: 'RENEWAL_NOT_OPEN',
      opensOn: '2028-12-15',
    })
  })

  it('renews on time inside the window and stays a Diplomate', async () => {
    await ctx.assignAndSubmit(userId, EMAIL)
    ctx.clock.set('2029-01-10') // window opened 2028-12-15, due 2029-03-15

    const { submission, status } = await ctx.assignAndSubmit(userId, EMAIL)
    expect(submission).toMatchObject({ purpose: 'RENEWAL', cycleNumber: 1, isLate: false })
    expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'ACTIVE' })
    expect(status.nextRenewal?.dueDate).toBe('2032-03-15')
  })

  it('accepts a late renewal during grace without moving the schedule', async () => {
    await ctx.assignAndSubmit(userId, EMAIL)
    ctx.clock.set('2030-06-01')

    await ctx.asAdmin()
    expect((await ctx.certification.getUserCertification(userId)).status.phase).toBe('GRACE')
    expect((await ctx.auth.restoreSession())?.role).toBe('ADMIN')

    const { submission, status } = await ctx.assignAndSubmit(userId, EMAIL)
    expect(submission).toMatchObject({ cycleNumber: 1, isLate: true })
    expect(status.nextRenewal?.dueDate).toBe('2032-03-15')
  })

  it('lapses to Candidate after grace, expires the open renewal, and keeps history', async () => {
    await ctx.assignAndSubmit(userId, EMAIL)
    ctx.clock.set('2031-01-01') // in grace for cycle 1
    await ctx.asAdmin()
    const renewal = await ctx.certification.assignForm(userId)
    expect(renewal).toMatchObject({ purpose: 'RENEWAL', cycleNumber: 1 })

    ctx.clock.set('2032-03-15') // grace for cycle 1 ends

    await ctx.asMember(EMAIL)
    const mine = await ctx.certification.getMyCertification()
    expect(mine.status).toMatchObject({
      role: 'CANDIDATE',
      phase: 'LAPSED',
      lapsedOn: '2032-03-15',
    })
    expect(mine.assignments[0]?.effectiveStatus).toBe('EXPIRED')
    expect(mine.submissions).toHaveLength(1)
    expect((await ctx.auth.restoreSession())?.role).toBe('CANDIDATE')
    expect(
      (await rejection(ctx.certification.submit(renewal.id, COMPLETE_APPLICATION))).message,
    ).toMatch(/grace period has ended/)

    // The Admin can start a new period with a fresh initial application.
    ctx.clock.set('2033-05-01')
    const { submission, status } = await ctx.assignAndSubmit(userId, EMAIL)
    expect(submission.purpose).toBe('INITIAL')
    expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'ACTIVE' })
    expect(status.periods.map((period) => [period.startDate, period.endedOn])).toEqual([
      ['2026-03-15', '2032-03-15'],
      ['2033-05-01', undefined],
    ])
    expect(submissionsCollection.repository(ctx.storage).list()).toHaveLength(2)
  })

  it('keeps members out of other members’ assignments and admin operations', async () => {
    await ctx.asAdmin()
    const assignment = await ctx.certification.assignForm(userId)
    const other = await ctx.registerCandidate('other@example.com')

    await ctx.asMember('other@example.com')
    expect((await rejection(ctx.certification.getAssignmentForm(assignment.id))).code).toBe(
      'NOT_FOUND',
    )
    expect((await rejection(ctx.certification.assignForm(other.id))).code).toBe('FORBIDDEN')

    await ctx.asAdmin()
    expect(
      (await rejection(ctx.certification.submit(assignment.id, COMPLETE_APPLICATION))).code,
    ).toBe('UNAUTHORIZED')
  })

  it('lets the Admin cancel an open assignment (kept as CANCELLED)', async () => {
    await ctx.asAdmin()
    const assignment = await ctx.certification.assignForm(userId)
    const cancelled = await ctx.certification.cancelAssignment(assignment.id)
    expect(cancelled.effectiveStatus).toBe('CANCELLED')
    expect((await ctx.certification.getUserCertification(userId)).eligibility.canAssign).toBe(true)
  })
})
