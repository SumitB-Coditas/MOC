import { ADMIN_ACCOUNT } from '@/config/admin'
import { createAuthService } from '@/features/auth/authService'
import { addDays } from '@/lib/date'
import type { Clock } from '@/services/clock'
import { bootstrapStorage } from '@/services/storage/bootstrap'
import { createMemoryStore } from '@/services/storage/keyValueStore'
import { APP_SEEDERS } from '@/services/storage/seeders'
import { createStorageClient } from '@/services/storage/storageClient'
import { createUserRoleResolver } from '@/services/userRole'
import type { FormValues } from '@/types/forms'
import { createCertificationService } from '../certificationService'

export const COMPLETE_APPLICATION: FormValues = {
  certificateNumber: 'CERT-2026/001',
  courseValidFrom: '2026-01-01',
  courseValidTo: '2026-12-31',
  specialty: 'surgery',
  yearsOfPractice: '7',
  institution: 'City Medical School',
  qualification: 'MBBS',
  declaration: true,
}

/** Isolated storage, a settable clock, and auth + certification services sharing both. */
export function createCertificationTestContext(startDate = '2026-03-15') {
  const storage = createStorageClient(createMemoryStore())
  bootstrapStorage(storage, { seeders: APP_SEEDERS })

  let today = startDate
  const clock: Clock & { set(date: string): void; advanceDays(days: number): void } = {
    now: () => new Date(`${today}T12:00:00.000Z`),
    today: () => today,
    set: (date) => {
      today = date
    },
    advanceDays: (days) => {
      today = addDays(today, days)
    },
  }

  const auth = createAuthService({
    storage,
    resolveRole: createUserRoleResolver(storage, clock),
    now: () => clock.now(),
    subscribeToExternalChanges: () => () => {},
  })
  const certification = createCertificationService({ storage, clock })

  async function asAdmin() {
    await auth.logout()
    await auth.login({ email: ADMIN_ACCOUNT.email, password: ADMIN_ACCOUNT.password })
  }

  async function asMember(email: string) {
    await auth.logout()
    return auth.login({ email, password: 'Secret123' })
  }

  async function registerCandidate(email = 'jane@example.com') {
    await auth.logout()
    const user = await auth.register({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-05-17',
      email,
      password: 'Secret123',
    })
    await auth.logout()
    return user
  }

  /** Admin assigns, the member submits a complete form. Returns the member's new status. */
  async function assignAndSubmit(userId: string, email: string) {
    await asAdmin()
    const assignment = await certification.assignForm(userId)
    await asMember(email)
    return certification.submit(assignment.id, COMPLETE_APPLICATION)
  }

  return {
    storage,
    clock,
    auth,
    certification,
    asAdmin,
    asMember,
    registerCandidate,
    assignAndSubmit,
  }
}
