import { describe, expect, it } from 'vitest'
import type { AssignmentPurpose } from '@/types/certification'
import { evaluateCertification, type CertificationRecord } from './engine'

const initial = (id: string, submittedOnDate: string): CertificationRecord => ({
  id,
  purpose: 'INITIAL',
  periodId: id,
  cycleNumber: 0,
  submittedOnDate,
})
const renewal = (
  id: string,
  periodId: string,
  cycleNumber: number,
  submittedOnDate: string,
): CertificationRecord => ({
  id,
  purpose: 'RENEWAL' satisfies AssignmentPurpose,
  periodId,
  cycleNumber,
  submittedOnDate,
})

const cycle = (status: ReturnType<typeof evaluateCertification>, n: number) =>
  status.periods.at(-1)?.cycles.find((c) => c.cycleNumber === n)

describe('evaluateCertification', () => {
  it('treats a user with no submissions as a not-yet-certified Candidate', () => {
    expect(evaluateCertification([], '2026-10-04')).toMatchObject({
      role: 'CANDIDATE',
      phase: 'NOT_CERTIFIED',
      periods: [],
    })
  })

  describe('required scenario: late renewal keeps the original schedule (2026 → 2035)', () => {
    const I = initial('i1', '2026-03-15')
    const R1 = renewal('r1', 'i1', 1, '2030-06-01')

    it('1. starts certification on the initial submission date; cycle 1 due 2029', () => {
      const status = evaluateCertification([I], '2026-03-15')
      expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'ACTIVE' })
      expect(status.currentPeriod?.startDate).toBe('2026-03-15')
      expect(cycle(status, 1)).toMatchObject({
        dueDate: '2029-03-15',
        graceEnds: '2032-03-15',
        state: 'UPCOMING',
      })
    })

    it('2. enters grace on the cycle 1 due date and stays a Diplomate', () => {
      const status = evaluateCertification([I], '2029-03-15')
      expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'GRACE' })
      expect(status.openRenewal?.cycleNumber).toBe(1)
    })

    it('3. a late cycle 1 renewal in 2030 keeps cycle 2 due in 2032 (not 2033)', () => {
      const status = evaluateCertification([I, R1], '2030-06-01')
      expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'ACTIVE' })
      expect(cycle(status, 1)?.state).toBe('RENEWED_LATE')
      expect(cycle(status, 2)).toMatchObject({ dueDate: '2032-03-15', graceEnds: '2035-03-15' })
      expect(status.nextRenewal?.dueDate).toBe('2032-03-15')
    })

    it('4. the day before cycle 2 is due, its renewal is open but not in grace', () => {
      const status = evaluateCertification([I, R1], '2032-03-14')
      expect(status.phase).toBe('RENEWAL_OPEN')
      expect(cycle(status, 2)?.state).toBe('OPEN')
    })

    it('5. on the cycle 2 due date it is in grace', () => {
      const status = evaluateCertification([I, R1], '2032-03-15')
      expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'GRACE' })
      expect(cycle(status, 2)?.state).toBe('IN_GRACE')
    })

    it('6. on the last day of grace the user is still a Diplomate', () => {
      expect(evaluateCertification([I, R1], '2035-03-14')).toMatchObject({
        role: 'DIPLOMATE',
        phase: 'GRACE',
      })
    })

    it('7. on the grace end date the user reverts to Candidate', () => {
      const status = evaluateCertification([I, R1], '2035-03-15')
      expect(status).toMatchObject({ role: 'CANDIDATE', phase: 'LAPSED', lapsedOn: '2035-03-15' })
      expect(status.currentPeriod).toBeUndefined()
      expect(cycle(status, 2)?.state).toBe('MISSED')
    })

    it('8. after lapsing, the full history is still reported', () => {
      const status = evaluateCertification([I, R1], '2035-03-15')
      expect(status.periods).toHaveLength(1)
      expect(status.periods[0]).toMatchObject({ periodId: 'i1', endedOn: '2035-03-15' })
      expect(cycle(status, 1)).toMatchObject({ state: 'RENEWED_LATE', submissionId: 'r1' })
    })
  })

  describe('boundaries', () => {
    const I = initial('i1', '2026-03-15')

    it('counts a renewal the day before the due date as on time and on it as late', () => {
      const onTime = evaluateCertification([I, renewal('r', 'i1', 1, '2029-03-14')], '2029-04-01')
      const late = evaluateCertification([I, renewal('r', 'i1', 1, '2029-03-15')], '2029-04-01')
      expect(cycle(onTime, 1)?.state).toBe('RENEWED_ON_TIME')
      expect(cycle(late, 1)?.state).toBe('RENEWED_LATE')
    })

    it('opens the renewal window exactly renewalWindowDays before the due date', () => {
      expect(cycle(evaluateCertification([I], '2028-12-14'), 1)?.state).toBe('UPCOMING')
      expect(cycle(evaluateCertification([I], '2028-12-15'), 1)).toMatchObject({
        windowOpens: '2028-12-15',
        state: 'OPEN',
      })
    })

    it('lapses exactly at the cycle 1 grace end', () => {
      expect(evaluateCertification([I], '2032-03-14').role).toBe('DIPLOMATE')
      expect(evaluateCertification([I], '2032-03-15')).toMatchObject({
        role: 'CANDIDATE',
        lapsedOn: '2032-03-15',
      })
    })

    it('clamps a Feb 29 start date to Feb 28 in non-leap years', () => {
      const status = evaluateCertification([initial('i1', '2028-02-29')], '2028-03-01')
      expect(cycle(status, 1)).toMatchObject({ dueDate: '2031-02-28', graceEnds: '2034-02-28' })
    })
  })

  describe('multiple cycles and periods', () => {
    it('keeps the schedule anchored when several renewals are late', () => {
      const status = evaluateCertification(
        [
          initial('i1', '2026-03-15'),
          renewal('r1', 'i1', 1, '2030-01-01'),
          renewal('r2', 'i1', 2, '2033-01-01'),
        ],
        '2033-01-01',
      )
      expect(status.phase).toBe('ACTIVE')
      expect(status.currentPeriod?.cycles.map((c) => [c.cycleNumber, c.state, c.dueDate])).toEqual([
        [1, 'RENEWED_LATE', '2029-03-15'],
        [2, 'RENEWED_LATE', '2032-03-15'],
        [3, 'UPCOMING', '2035-03-15'],
      ])
    })

    it('offers the oldest outstanding renewal first when two overlap', () => {
      // Cycle 1 in its last 90 days of grace, while cycle 2's window is already open.
      const status = evaluateCertification([initial('i1', '2026-03-15')], '2032-02-01')
      expect(status.currentPeriod?.cycles.map((c) => c.state)).toEqual([
        'IN_GRACE',
        'OPEN',
        'UPCOMING',
      ])
      expect(status.openRenewal?.cycleNumber).toBe(1)
    })

    it('starts a new period after re-certification and keeps the lapsed one', () => {
      const status = evaluateCertification(
        [initial('i1', '2026-03-15'), initial('i2', '2033-05-01')],
        '2033-05-01',
      )
      expect(status).toMatchObject({ role: 'DIPLOMATE', phase: 'ACTIVE' })
      expect(status.periods.map((p) => [p.periodId, p.startDate, p.endedOn])).toEqual([
        ['i1', '2026-03-15', '2032-03-15'],
        ['i2', '2033-05-01', undefined],
      ])
      expect(status.nextRenewal?.dueDate).toBe('2036-05-01')
    })

    it('does not depend on submission order', () => {
      const records = [
        renewal('r2', 'i1', 2, '2032-01-01'),
        initial('i1', '2026-03-15'),
        renewal('r1', 'i1', 1, '2029-01-01'),
      ]
      expect(evaluateCertification(records, '2032-06-01')).toEqual(
        evaluateCertification([...records].reverse(), '2032-06-01'),
      )
    })

    it('ignores submissions dated after today', () => {
      expect(evaluateCertification([initial('i1', '2026-03-15')], '2026-03-14').role).toBe(
        'CANDIDATE',
      )
    })
  })

  it.each([90, 365])(
    'the confirmed rules hold with a %i-day renewal window (provisional value)',
    (renewalWindowDays) => {
      const config = { cycleYears: 3, renewalWindowDays }
      const records = [initial('i1', '2026-03-15'), renewal('r1', 'i1', 1, '2030-06-01')]
      const at = (today: string) => evaluateCertification(records, today, config)

      expect(at('2029-03-15').phase).toBe('GRACE') // the 2030 renewal does not count yet
      expect(cycle(at('2030-06-01'), 2)?.dueDate).toBe('2032-03-15')
      expect(at('2035-03-14').role).toBe('DIPLOMATE')
      expect(at('2035-03-15').role).toBe('CANDIDATE')
    },
  )
})
