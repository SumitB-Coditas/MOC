import { describe, expect, it } from 'vitest'
import { ADMIN_ACCOUNT } from '@/config/admin'
import { AppError } from '@/lib/errors'
import { usersCollection } from '@/services/repositories/users'
import { STORAGE_KEYS } from '@/services/storage/keys'
import { INVALID_CREDENTIALS_MESSAGE } from './authService'
import type { RegistrationInput } from './schemas'
import { createTestAuthService, VALID_REGISTRATION } from './testing/createTestAuthService'

async function expectRejection(
  promise: Promise<unknown>,
  code: AppError['code'],
  message?: string,
) {
  const error = await promise.then(
    () => {
      throw new Error(`Expected AppError ${code}`)
    },
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(AppError)
  expect((error as AppError).code).toBe(code)
  if (message) expect((error as AppError).message).toBe(message)
  return error as AppError
}

/** Every value persisted by the app, as raw strings. */
function rawStorage(storage: ReturnType<typeof createTestAuthService>['storage']) {
  return Object.values(STORAGE_KEYS)
    .map((key) => JSON.stringify(storage.read(key, (raw) => raw) ?? null))
    .join('\n')
}

describe('authService', () => {
  describe('admin login', () => {
    it('signs in the preconfigured admin', async () => {
      const { service } = createTestAuthService()
      const user = await service.login({
        email: ADMIN_ACCOUNT.email,
        password: ADMIN_ACCOUNT.password,
      })
      expect(user).toMatchObject({ id: ADMIN_ACCOUNT.id, role: 'ADMIN' })
    })

    it('accepts the admin email in any case and with surrounding spaces', async () => {
      const { service } = createTestAuthService()
      const user = await service.login({
        email: `  ${ADMIN_ACCOUNT.email.toUpperCase()} `,
        password: ADMIN_ACCOUNT.password,
      })
      expect(user.role).toBe('ADMIN')
    })

    it('rejects a wrong admin password', async () => {
      const { service } = createTestAuthService()
      await expectRejection(
        service.login({ email: ADMIN_ACCOUNT.email, password: 'wrong' }),
        'UNAUTHORIZED',
        INVALID_CREDENTIALS_MESSAGE,
      )
    })
  })

  describe('candidate registration', () => {
    it('creates a Candidate, signs them in, and allows later login', async () => {
      const { service } = createTestAuthService()

      const registered = await service.register(VALID_REGISTRATION)
      expect(registered).toMatchObject({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        role: 'CANDIDATE',
      })
      expect(await service.restoreSession()).toEqual(registered)

      await service.logout()
      const loggedIn = await service.login({
        email: 'Jane.Doe@Example.com',
        password: VALID_REGISTRATION.password,
      })
      expect(loggedIn).toEqual(registered)
    })

    it('never persists the plaintext password or the confirmation', async () => {
      const { service, storage } = createTestAuthService()
      await service.register(VALID_REGISTRATION)

      const [stored] = usersCollection.repository(storage).list()
      expect(Object.keys(stored ?? {}).sort()).toEqual(
        [
          'createdAt',
          'dateOfBirth',
          'email',
          'firstName',
          'id',
          'lastName',
          'passwordHash',
          'passwordSalt',
          'updatedAt',
        ].sort(),
      )
      expect(rawStorage(storage)).not.toContain(VALID_REGISTRATION.password)
    })

    it.each(['jane.doe@example.com', 'JANE.DOE@EXAMPLE.COM', '  Jane.Doe@Example.com  '])(
      'rejects the duplicate email %j (case-insensitive)',
      async (email) => {
        const { service } = createTestAuthService()
        await service.register(VALID_REGISTRATION)

        const error = await expectRejection(
          service.register({ ...VALID_REGISTRATION, email }),
          'CONFLICT',
        )
        expect(error.fieldErrors?.email).toBe('An account with this email already exists.')
      },
    )

    it('reserves the admin email', async () => {
      const { service } = createTestAuthService()
      await expectRejection(
        service.register({ ...VALID_REGISTRATION, email: ADMIN_ACCOUNT.email.toUpperCase() }),
        'CONFLICT',
      )
    })

    it.each([{ role: 'ADMIN' }, { role: 'DIPLOMATE' }, { isAdmin: true }])(
      'refuses privileged registration payload %j',
      async (extra) => {
        const { service, storage } = createTestAuthService()
        const payload = { ...VALID_REGISTRATION, ...extra } as RegistrationInput

        await expectRejection(service.register(payload), 'VALIDATION')
        expect(usersCollection.repository(storage).list()).toEqual([])
      },
    )

    it('validates input on the service side too', async () => {
      const { service } = createTestAuthService()
      const error = await expectRejection(
        service.register({ ...VALID_REGISTRATION, email: 'nope', dateOfBirth: '2999-01-01' }),
        'VALIDATION',
      )
      expect(error.fieldErrors).toEqual({
        email: 'Enter a valid email address.',
        dateOfBirth: 'Date of birth must be in the past.',
      })
    })
  })

  describe('invalid credentials', () => {
    it('uses the same message for an unknown email and a wrong password', async () => {
      const { service } = createTestAuthService()
      await service.register(VALID_REGISTRATION)
      await service.logout()

      await expectRejection(
        service.login({ email: 'nobody@example.com', password: VALID_REGISTRATION.password }),
        'UNAUTHORIZED',
        INVALID_CREDENTIALS_MESSAGE,
      )
      await expectRejection(
        service.login({ email: VALID_REGISTRATION.email, password: 'Wrong123' }),
        'UNAUTHORIZED',
        INVALID_CREDENTIALS_MESSAGE,
      )
      expect(await service.restoreSession()).toBeNull()
    })

    it('rejects a soft-deleted user', async () => {
      const { service, storage } = createTestAuthService()
      const { id } = await service.register(VALID_REGISTRATION)
      await service.logout()
      usersCollection.repository(storage).update(id, { deletedAt: '2026-10-04T00:00:00.000Z' })

      await expectRejection(
        service.login({ email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password }),
        'UNAUTHORIZED',
        INVALID_CREDENTIALS_MESSAGE,
      )
    })
  })

  describe('session', () => {
    it('survives a reload (a new service instance over the same storage)', async () => {
      const first = createTestAuthService()
      const user = await first.service.register(VALID_REGISTRATION)

      const afterReload = createTestAuthService({ storage: first.storage })
      expect(await afterReload.service.restoreSession()).toEqual(user)
    })

    it('restores the admin session', async () => {
      const first = createTestAuthService()
      await first.service.login({ email: ADMIN_ACCOUNT.email, password: ADMIN_ACCOUNT.password })

      const afterReload = createTestAuthService({ storage: first.storage })
      expect((await afterReload.service.restoreSession())?.role).toBe('ADMIN')
    })

    it('stores no credentials in the session', async () => {
      const { service, storage } = createTestAuthService()
      const user = await service.register(VALID_REGISTRATION)

      const session = storage.read(STORAGE_KEYS.session, (raw) => raw)
      expect(session).toEqual({ actorId: user.id, role: 'CANDIDATE', issuedAt: expect.any(String) })
    })

    it('logout clears the session', async () => {
      const { service, storage } = createTestAuthService()
      await service.register(VALID_REGISTRATION)
      await service.logout()

      expect(storage.has(STORAGE_KEYS.session)).toBe(false)
      expect(await service.restoreSession()).toBeNull()
    })

    it('re-derives the role on restore instead of trusting the stored snapshot', async () => {
      const { service, storage } = createTestAuthService()
      const user = await service.register(VALID_REGISTRATION)
      storage.write(STORAGE_KEYS.session, { actorId: user.id, role: 'ADMIN', issuedAt: 'x' })

      expect((await service.restoreSession())?.role).toBe('CANDIDATE')
    })

    it('signs in Diplomates with their derived role', async () => {
      const { service, storage } = createTestAuthService({ resolveRole: () => 'DIPLOMATE' })
      await service.register(VALID_REGISTRATION)
      await service.logout()

      const user = await service.login({
        email: VALID_REGISTRATION.email,
        password: VALID_REGISTRATION.password,
      })
      expect(user.role).toBe('DIPLOMATE')
      expect(storage.read(STORAGE_KEYS.session, (raw) => raw)).toMatchObject({ role: 'DIPLOMATE' })
    })

    it('drops a session whose user no longer exists', async () => {
      const { service, storage } = createTestAuthService()
      const { id } = await service.register(VALID_REGISTRATION)
      usersCollection.repository(storage).remove(id)

      expect(await service.restoreSession()).toBeNull()
      expect(storage.has(STORAGE_KEYS.session)).toBe(false)
    })

    it('discards a corrupted session instead of failing', async () => {
      const { service, storage } = createTestAuthService()
      storage.write(STORAGE_KEYS.session, { actorId: 42 })

      expect(await service.restoreSession()).toBeNull()
      expect(storage.has(STORAGE_KEYS.session)).toBe(false)
    })
  })
})
