import type { FormDefinition } from '@/types/forms'

/**
 * The single predefined, reusable certificate form (plan §6). It is used for the initial
 * application and every renewal (A4). Admins assign it; there is no form builder.
 */
export const CERTIFICATE_APPLICATION_FORM: FormDefinition = {
  id: 'form-cert-application',
  code: 'CERT_APPLICATION',
  title: 'Certificate Application',
  description: 'Used for the initial certification application and for every renewal.',
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  sections: [
    {
      id: 'certificate',
      title: 'Certificate details',
      fields: [
        {
          name: 'certificateNumber',
          label: 'Certificate Number',
          type: 'text',
          required: true,
          min: 3,
          max: 50,
          pattern: '^[A-Za-z0-9/-]+$',
          patternMessage: 'Use letters, numbers, "-" or "/" only.',
        },
        { name: 'courseValidFrom', label: 'Course Valid From', type: 'date', required: true },
        { name: 'courseValidTo', label: 'Course Valid To', type: 'date', required: true },
      ],
    },
    {
      id: 'professional',
      title: 'Professional details',
      fields: [
        {
          name: 'specialty',
          label: 'Specialty',
          type: 'select',
          required: true,
          options: [
            { label: 'General Medicine', value: 'general-medicine' },
            { label: 'Surgery', value: 'surgery' },
            { label: 'Pediatrics', value: 'pediatrics' },
            { label: 'Psychiatry', value: 'psychiatry' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'yearsOfPractice',
          label: 'Years of Practice',
          type: 'number',
          required: true,
          min: 0,
          max: 60,
        },
      ],
    },
    {
      id: 'education',
      title: 'Education',
      fields: [
        { name: 'institution', label: 'Institution', type: 'text', required: true, max: 100 },
        { name: 'qualification', label: 'Qualification', type: 'text', required: true, max: 100 },
      ],
    },
    {
      id: 'declaration',
      title: 'Declaration',
      fields: [
        {
          name: 'declaration',
          label: 'I confirm that the information provided is accurate and complete.',
          type: 'checkbox',
          required: true,
        },
      ],
    },
  ],
  rules: [
    {
      type: 'dateAfter',
      field: 'courseValidTo',
      otherField: 'courseValidFrom',
      message: 'Course Valid To must be after Course Valid From.',
    },
  ],
}
