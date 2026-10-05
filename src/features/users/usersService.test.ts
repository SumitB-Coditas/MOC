import { beforeEach, describe, expect, it } from 'vitest'
import { ADMIN_ACCOUNT } from '@/config/admin'
import { VALID_REGISTRATION } from '@/features/auth/testing/createTestAuthService'
import { AppError } from '@/lib/errors'
import { STORAGE_KEYS } from '@/services/storage/keys'
import type { UpdateProfileInput } from './schemas'
import { createAdminTestContext, FIXED_NOW, SECRET_HASH, SECRET_SALT } from './testing/fixtures'

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => {
      throw new Error('Expected the promise to reject')
    },
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(AppError)
  return error as AppError
}

const names = (users: { firstName: string }[]) => users.map((user) => user.firstName)

const ADA_PROFILE: UpdateProfileInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  dateOfBirth: '1985-12-10',
  email: 'ada@example.com',
}

describe('usersService', () => {
  let context: ReturnType<typeof createAdminTestContext>

  beforeEach(async () => {
    context = createAdminTestContext()
    await context.signInAsAdmin()
  })

  describe('authorization', () => {
    it('refuses every operation without an admin session', async () => {
      await context.auth.logout()
      const { usersService } = context
      for (const call of [
        () => usersService.listUsers(),
        () => usersService.getUser('u-ada'),
        () => usersService.getOverview(),
        () => usersService.updateProfile('u-ada', ADA_PROFILE),
        () => usersService.deactivateUser('u-ada'),
        () => usersService.reactivateUser('u-katherine'),
      ]) {
        expect((await rejection(call())).code).toBe('FORBIDDEN')
      }
    })

    it('refuses a signed-in Candidate', async () => {
      await context.auth.logout()
      await context.auth.register(VALID_REGISTRATION)
      expect((await rejection(context.usersService.listUsers())).code).toBe('FORBIDDEN')
    })
  })

  describe('listUsers', () => {
    it('lists active users by default, sorted by last name, without password data', async () => {
      const users = await context.usersService.listUsers()

      expect(names(users)).toEqual(['Grace', 'Ada', 'Alan'])
      expect(users.map((user) => user.role)).toEqual(['DIPLOMATE', 'CANDIDATE', 'CANDIDATE'])
      for (const user of users) {
        expect(user).not.toHaveProperty('passwordHash')
        expect(user).not.toHaveProperty('passwordSalt')
      }
      expect(JSON.stringify(users)).not.toMatch(new RegExp(`${SECRET_HASH}|${SECRET_SALT}`))
    })

    it.each([
      ['lovelace', ['Ada']],
      ['ADA LOVE', ['Ada']],
      ['turing alan', ['Alan']],
      ['NAVY.EXAMPLE', ['Grace']],
      ['example.com', ['Ada', 'Alan']],
      ['  grace  ', ['Grace']],
      ['nobody', []],
    ])('searches name and email for %j', async (search, expected) => {
      expect(names(await context.usersService.listUsers({ search }))).toEqual(expected)
    })

    it('filters by role', async () => {
      const { usersService } = context
      expect(names(await usersService.listUsers({ role: 'CANDIDATE' }))).toEqual(['Ada', 'Alan'])
      expect(names(await usersService.listUsers({ role: 'DIPLOMATE' }))).toEqual(['Grace'])
      expect(await usersService.listUsers({ role: 'ALL' })).toHaveLength(3)
    })

    it('filters by account status', async () => {
      const { usersService } = context
      const inactive = await usersService.listUsers({ status: 'INACTIVE' })
      expect(names(inactive)).toEqual(['Katherine'])
      expect(inactive[0]).toMatchObject({
        status: 'INACTIVE',
        deactivatedAt: '2026-06-01T10:00:00.000Z',
      })
      expect(await usersService.listUsers({ status: 'ALL' })).toHaveLength(4)
    })

    it('combines search, role and status', async () => {
      expect(
        names(
          await context.usersService.listUsers({
            search: 'example.com',
            role: 'CANDIDATE',
            status: 'ALL',
          }),
        ),
      ).toEqual(['Katherine', 'Ada', 'Alan'])
    })
  })

  describe('getUser and getOverview', () => {
    it('loads the requested user', async () => {
      expect(await context.usersService.getUser('u-alan')).toMatchObject({
        id: 'u-alan',
        firstName: 'Alan',
        email: 'alan.turing@example.com',
        role: 'CANDIDATE',
        status: 'ACTIVE',
      })
    })

    it('reports an unknown user as NOT_FOUND', async () => {
      expect((await rejection(context.usersService.getUser('missing'))).code).toBe('NOT_FOUND')
    })

    it('counts active users by role and lists recent registrations', async () => {
      const overview = await context.usersService.getOverview()
      expect(overview).toMatchObject({
        activeCandidates: 2,
        activeDiplomates: 1,
        totalActive: 3,
        inactive: 1,
      })
      expect(names(overview.recentRegistrations)).toEqual(['Alan', 'Grace', 'Ada'])
    })
  })

  describe('updateProfile', () => {
    it('updates the editable fields and normalizes the email', async () => {
      const updated = await context.usersService.updateProfile('u-ada', {
        firstName: '  Augusta Ada ',
        lastName: 'King',
        dateOfBirth: '1985-12-11',
        email: '  Ada.King@Example.COM ',
      })

      expect(updated).toMatchObject({
        firstName: 'Augusta Ada',
        lastName: 'King',
        dateOfBirth: '1985-12-11',
        email: 'ada.king@example.com',
        updatedAt: FIXED_NOW.toISOString(),
      })
      const stored = context.repository.findById('u-ada')
      expect(stored).toMatchObject({ email: 'ada.king@example.com', passwordHash: SECRET_HASH })
      expect(stored?.createdAt).toBe('2026-03-01T10:00:00.000Z')
    })

    it('lets a user keep their own email in a different case', async () => {
      const updated = await context.usersService.updateProfile('u-ada', {
        ...ADA_PROFILE,
        email: 'ADA@EXAMPLE.COM',
      })
      expect(updated.email).toBe('ada@example.com')
    })

    it('rejects invalid values with field errors', async () => {
      const error = await rejection(
        context.usersService.updateProfile('u-ada', {
          firstName: ' ',
          lastName: 'Lovelace',
          dateOfBirth: '2999-01-01',
          email: 'not-an-email',
        }),
      )
      expect(error.code).toBe('VALIDATION')
      expect(error.fieldErrors).toEqual({
        firstName: 'First name is required.',
        dateOfBirth: 'Date of birth must be in the past.',
        email: 'Enter a valid email address.',
      })
      expect(context.repository.findById('u-ada')?.firstName).toBe('Ada')
    })

    it.each(['alan.turing@example.com', 'ALAN.Turing@EXAMPLE.com', 'katherine@example.com'])(
      'rejects the duplicate email %j (case-insensitive, inactive users included)',
      async (email) => {
        const error = await rejection(
          context.usersService.updateProfile('u-ada', { ...ADA_PROFILE, email }),
        )
        expect(error.code).toBe('CONFLICT')
        expect(error.fieldErrors?.email).toBe('An account with this email already exists.')
      },
    )

    it('rejects the admin demo email', async () => {
      const error = await rejection(
        context.usersService.updateProfile('u-ada', {
          ...ADA_PROFILE,
          email: ADMIN_ACCOUNT.email.toUpperCase(),
        }),
      )
      expect(error.code).toBe('CONFLICT')
      expect(error.fieldErrors?.email).toBe('This email address is reserved.')
    })

    it.each([{ role: 'DIPLOMATE' }, { password: 'NewPass123' }, { id: 'other' }])(
      'refuses to change non-editable field %j',
      async (extra) => {
        const error = await rejection(
          context.usersService.updateProfile('u-ada', {
            ...ADA_PROFILE,
            ...extra,
          } as UpdateProfileInput),
        )
        expect(error.code).toBe('VALIDATION')
        expect(context.repository.findById('u-ada')?.passwordHash).toBe(SECRET_HASH)
      },
    )

    it('reports an unknown user as NOT_FOUND', async () => {
      expect(
        (await rejection(context.usersService.updateProfile('missing', ADA_PROFILE))).code,
      ).toBe('NOT_FOUND')
    })
  })

  describe('deactivation', () => {
    it('soft-deletes: the record stays in storage with every field intact', async () => {
      const before = context.repository.findById('u-ada')
      const result = await context.usersService.deactivateUser('u-ada')

      expect(result).toMatchObject({ status: 'INACTIVE', deactivatedAt: FIXED_NOW.toISOString() })
      expect(context.repository.list()).toHaveLength(4)
      expect(context.repository.findById('u-ada')).toEqual({
        ...before,
        deletedAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      })
    })

    it('removes the user from the active list and shows them under inactive', async () => {
      await context.usersService.deactivateUser('u-ada')

      expect(names(await context.usersService.listUsers())).toEqual(['Grace', 'Alan'])
      expect(names(await context.usersService.listUsers({ status: 'INACTIVE' }))).toEqual([
        'Katherine',
        'Ada',
      ])
    })

    it('reactivates a user and clears the deactivation marker', async () => {
      const result = await context.usersService.reactivateUser('u-katherine')

      expect(result.status).toBe('ACTIVE')
      expect(result).not.toHaveProperty('deactivatedAt')
      expect(context.repository.findById('u-katherine')?.deletedAt).toBeUndefined()
      expect(names(await context.usersService.listUsers({ search: 'katherine' }))).toEqual([
        'Katherine',
      ])
    })

    it('rejects deactivating an inactive user or reactivating an active one', async () => {
      expect((await rejection(context.usersService.deactivateUser('u-katherine'))).code).toBe(
        'CONFLICT',
      )
      expect((await rejection(context.usersService.reactivateUser('u-ada'))).code).toBe('CONFLICT')
    })

    it('never deactivates the admin account (which is also the acting admin)', async () => {
      const error = await rejection(context.usersService.deactivateUser(ADMIN_ACCOUNT.id))
      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('The administrator account cannot be deactivated.')
      expect((await rejection(context.usersService.reactivateUser(ADMIN_ACCOUNT.id))).code).toBe(
        'FORBIDDEN',
      )
    })

    it('stops a deactivated user from signing in, and keeps their email reserved', async () => {
      await context.auth.logout()
      const registered = await context.auth.register(VALID_REGISTRATION)
      await context.auth.logout()
      await context.signInAsAdmin()
      await context.usersService.deactivateUser(registered.id)
      await context.auth.logout()

      expect(
        (
          await rejection(
            context.auth.login({
              email: VALID_REGISTRATION.email,
              password: VALID_REGISTRATION.password,
            }),
          )
        ).code,
      ).toBe('UNAUTHORIZED')
      expect((await rejection(context.auth.register(VALID_REGISTRATION))).code).toBe('CONFLICT')
    })

    it("invalidates a deactivated user's existing session on the next validation", async () => {
      await context.auth.logout()
      const registered = await context.auth.register(VALID_REGISTRATION)
      expect(await context.auth.restoreSession()).not.toBeNull()

      // The deactivation happens elsewhere (e.g. the record changes underneath the session).
      context.repository.update(registered.id, { deletedAt: FIXED_NOW.toISOString() })

      expect(await context.auth.restoreSession()).toBeNull()
      expect(context.storage.has(STORAGE_KEYS.session)).toBe(false)
    })
  })
})
