import { describe, expect, it } from 'vitest'
import { toIsoDate, todayIsoDate } from '@/lib/date'
import { loginSchema, registerFormSchema, registrationInputSchema } from './schemas'
import { VALID_REGISTRATION } from './testing/createTestAuthService'

const VALID_FORM = { ...VALID_REGISTRATION, confirmPassword: VALID_REGISTRATION.password }

/** First error message per field for a failed parse. */
function errorsOf(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  const errors: Record<string, string> = {}
  for (const issue of result.error?.issues ?? []) {
    const key = String(issue.path[0] ?? '')
    errors[key] ??= issue.message
  }
  return errors
}

describe('registerFormSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerFormSchema.safeParse(VALID_FORM).success).toBe(true)
  })

  it('rejects a password confirmation that does not match', () => {
    const result = registerFormSchema.safeParse({ ...VALID_FORM, confirmPassword: 'Secret124' })
    expect(errorsOf(result)).toEqual({ confirmPassword: 'Passwords do not match.' })
  })

  it('requires the password confirmation', () => {
    const result = registerFormSchema.safeParse({ ...VALID_FORM, confirmPassword: '' })
    expect(errorsOf(result).confirmPassword).toBe('Confirm your password.')
  })

  it('requires every field', () => {
    const result = registerFormSchema.safeParse({
      firstName: ' ',
      lastName: '',
      dateOfBirth: '',
      email: '',
      password: '',
      confirmPassword: '',
    })
    expect(Object.keys(errorsOf(result)).sort()).toEqual(
      ['confirmPassword', 'dateOfBirth', 'email', 'firstName', 'lastName', 'password'].sort(),
    )
  })

  it.each(['not-an-email', 'jane@', '@example.com', 'jane doe@example.com'])(
    'rejects the invalid email %s',
    (email) => {
      expect(errorsOf(registerFormSchema.safeParse({ ...VALID_FORM, email })).email).toBe(
        'Enter a valid email address.',
      )
    },
  )

  it('normalizes email to trimmed lower case', () => {
    const result = registerFormSchema.parse({ ...VALID_FORM, email: '  Jane.DOE@Example.COM ' })
    expect(result.email).toBe('jane.doe@example.com')
  })

  it.each([
    ['2026-02-30', 'Enter a valid date.'],
    ['17/05/1990', 'Enter a valid date.'],
    ['2999-01-01', 'Date of birth must be in the past.'],
  ])('rejects the date of birth %s', (dateOfBirth, message) => {
    expect(errorsOf(registerFormSchema.safeParse({ ...VALID_FORM, dateOfBirth })).dateOfBirth).toBe(
      message,
    )
  })

  it('rejects today as a date of birth', () => {
    const result = registerFormSchema.safeParse({ ...VALID_FORM, dateOfBirth: todayIsoDate() })
    expect(errorsOf(result).dateOfBirth).toBe('Date of birth must be in the past.')
  })

  it('enforces no minimum age (yesterday is accepted)', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = registerFormSchema.safeParse({
      ...VALID_FORM,
      dateOfBirth: toIsoDate(yesterday),
    })
    expect(result.success).toBe(true)
  })

  it.each([
    ['Sh0rt', 'Password must be at least 8 characters.'],
    ['12345678', 'Password must contain a letter.'],
    ['Password', 'Password must contain a number.'],
  ])('rejects the weak password %s', (password, message) => {
    const result = registerFormSchema.safeParse({
      ...VALID_FORM,
      password,
      confirmPassword: password,
    })
    expect(errorsOf(result).password).toBe(message)
  })
})

describe('registrationInputSchema', () => {
  it('rejects privileged or UI-only fields', () => {
    expect(
      registrationInputSchema.safeParse({ ...VALID_REGISTRATION, role: 'ADMIN' }).success,
    ).toBe(false)
    expect(
      registrationInputSchema.safeParse({ ...VALID_REGISTRATION, confirmPassword: 'Secret123' })
        .success,
    ).toBe(false)
  })
})

describe('loginSchema', () => {
  it('requires a valid email and a password', () => {
    expect(errorsOf(loginSchema.safeParse({ email: '', password: '' }))).toEqual({
      email: 'Email is required.',
      password: 'Password is required.',
    })
  })
})
