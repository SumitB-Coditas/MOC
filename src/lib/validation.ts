import { z } from 'zod'
import { isValidIsoDate, todayIsoDate } from './date'
import { normalizeEmail } from './email'

/**
 * Field rules shared by every form and service that accepts profile data (registration,
 * admin profile edits), so the same input is always judged the same way.
 */

export const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .pipe(z.email('Enter a valid email address.'))
  .transform(normalizeEmail)

export const personNameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} must be 50 characters or fewer.`)

// No minimum age is enforced: none is specified by the business rules.
export const dateOfBirthField = z
  .string()
  .min(1, 'Date of birth is required.')
  .refine(isValidIsoDate, { error: 'Enter a valid date.', abort: true })
  .refine((value) => value < todayIsoDate(), 'Date of birth must be in the past.')

export const newPasswordField = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/\d/, 'Password must contain a number.')

/** The editable profile of a registered user. */
export const profileFields = {
  firstName: personNameField('First name'),
  lastName: personNameField('Last name'),
  dateOfBirth: dateOfBirthField,
  email: emailField,
}

/** First message per field, in the shape `AppError.fieldErrors` expects. */
export function toFieldErrors(error: z.ZodError): {
  formError?: string
  fieldErrors: Record<string, string>
} {
  const { formErrors, fieldErrors } = z.flattenError(error)
  return {
    formError: formErrors[0],
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors as Record<string, string[] | undefined>).flatMap(
        ([field, messages]) => (messages?.[0] ? [[field, messages[0]]] : []),
      ),
    ),
  }
}
