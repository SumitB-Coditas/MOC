import { z } from 'zod'
import { isValidIsoDate } from '@/lib/date'
import type { FormDefinition, FormField, FormValues } from '@/types/forms'

const allFields = (form: FormDefinition) => form.sections.flatMap((section) => section.fields)

/** The first failed check for a non-checkbox value, or undefined when valid. */
function checkValue(field: FormField, value: string): string | undefined {
  if (value === '') return field.required ? `${field.label} is required.` : undefined
  switch (field.type) {
    case 'date':
      return isValidIsoDate(value) ? undefined : 'Enter a valid date.'
    case 'number': {
      if (!/^\d+$/.test(value)) return 'Enter a whole number.'
      const number = Number(value)
      const outOfRange =
        (field.min !== undefined && number < field.min) ||
        (field.max !== undefined && number > field.max)
      return outOfRange
        ? `${field.label} must be between ${field.min ?? 0} and ${field.max ?? 'any'}.`
        : undefined
    }
    case 'select':
      return field.options?.some((option) => option.value === value)
        ? undefined
        : 'Select a valid option.'
    default:
      if (field.min !== undefined && value.length < field.min) {
        return `${field.label} must be at least ${field.min} characters.`
      }
      if (field.max !== undefined && value.length > field.max) {
        return `${field.label} must be ${field.max} characters or fewer.`
      }
      if (field.pattern && !new RegExp(field.pattern).test(value)) {
        return field.patternMessage ?? `${field.label} is invalid.`
      }
      return undefined
  }
}

function submitField(field: FormField): z.ZodType<string | boolean> {
  if (field.type === 'checkbox') {
    return field.required
      ? z.literal(true, { error: 'You must confirm this declaration.' })
      : z.boolean()
  }
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = checkValue(field, value)
      if (message) ctx.addIssue({ code: 'custom', message })
    })
}

/** Full validation used on submit: required fields, formats, ranges and cross-field rules. */
export function buildSubmitSchema(form: FormDefinition): z.ZodType<FormValues> {
  const shape = Object.fromEntries(allFields(form).map((field) => [field.name, submitField(field)]))
  return z.object(shape).superRefine((values, ctx) => {
    for (const rule of form.rules ?? []) {
      const later = values[rule.field]
      const earlier = values[rule.otherField]
      if (
        typeof later === 'string' &&
        typeof earlier === 'string' &&
        isValidIsoDate(later) &&
        isValidIsoDate(earlier) &&
        later <= earlier
      ) {
        ctx.addIssue({ code: 'custom', path: [rule.field], message: rule.message })
      }
    }
  }) as z.ZodType<FormValues>
}

/**
 * Lenient validation for drafts: any field may be empty or incomplete, but values must
 * have the right type, and unknown fields are dropped.
 */
export function buildDraftSchema(form: FormDefinition): z.ZodType<FormValues> {
  const shape = Object.fromEntries(
    allFields(form).map((field) => [
      field.name,
      (field.type === 'checkbox' ? z.boolean() : z.string().max(1000)).optional(),
    ]),
  )
  return z.object(shape) as unknown as z.ZodType<FormValues>
}

/** Empty values for every field, overlaid with any saved draft. */
export function initialFormValues(form: FormDefinition, draft?: FormValues): FormValues {
  return Object.fromEntries(
    allFields(form).map((field) => [
      field.name,
      draft?.[field.name] ?? (field.type === 'checkbox' ? false : ''),
    ]),
  )
}
