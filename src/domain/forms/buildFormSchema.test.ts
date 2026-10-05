import { describe, expect, it } from 'vitest'
import { CERTIFICATE_APPLICATION_FORM as FORM } from './certificateApplicationForm'
import { buildDraftSchema, buildSubmitSchema, initialFormValues } from './buildFormSchema'

const VALID_VALUES = {
  certificateNumber: 'CERT-2026/001',
  courseValidFrom: '2026-01-01',
  courseValidTo: '2026-12-31',
  specialty: 'surgery',
  yearsOfPractice: '7',
  institution: 'City Medical School',
  qualification: 'MBBS',
  declaration: true,
}

function errors(values: Record<string, unknown>) {
  const result = buildSubmitSchema(FORM).safeParse(values)
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]),
  )
}

describe('buildSubmitSchema (certificate application)', () => {
  it('accepts a complete application', () => {
    expect(buildSubmitSchema(FORM).safeParse(VALID_VALUES).success).toBe(true)
  })

  it('requires every field and the declaration', () => {
    expect(Object.keys(errors(initialFormValues(FORM))).sort()).toEqual(
      [
        'certificateNumber',
        'courseValidFrom',
        'courseValidTo',
        'declaration',
        'institution',
        'qualification',
        'specialty',
        'yearsOfPractice',
      ].sort(),
    )
  })

  it.each([
    ['AB', 'Certificate Number must be at least 3 characters.'],
    ['CERT 001', 'Use letters, numbers, "-" or "/" only.'],
  ])('validates the certificate number %j', (certificateNumber, message) => {
    expect(errors({ ...VALID_VALUES, certificateNumber }).certificateNumber).toBe(message)
  })

  it.each(['2026-01-01', '2025-12-31'])(
    'requires Course Valid To after Course Valid From (To = %s)',
    (courseValidTo) => {
      expect(errors({ ...VALID_VALUES, courseValidTo }).courseValidTo).toBe(
        'Course Valid To must be after Course Valid From.',
      )
    },
  )

  it('validates dates, numbers and select options', () => {
    expect(
      errors({
        ...VALID_VALUES,
        courseValidFrom: '2026-02-30',
        yearsOfPractice: '61',
        specialty: 'x',
      }),
    ).toEqual({
      courseValidFrom: 'Enter a valid date.',
      yearsOfPractice: 'Years of Practice must be between 0 and 60.',
      specialty: 'Select a valid option.',
    })
  })
})

describe('buildDraftSchema', () => {
  it('accepts incomplete drafts and drops unknown fields', () => {
    const draft = buildDraftSchema(FORM).parse({ certificateNumber: 'C', role: 'ADMIN' })
    expect(draft).toEqual({ certificateNumber: 'C' })
  })

  it('still rejects values of the wrong type', () => {
    expect(buildDraftSchema(FORM).safeParse({ declaration: 'yes' }).success).toBe(false)
  })
})
