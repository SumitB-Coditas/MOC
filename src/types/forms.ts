export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'checkbox'

export interface FormField {
  name: string
  label: string
  type: FieldType
  required: boolean
  helpText?: string
  options?: { label: string; value: string }[]
  /** number: value range; text: length range. */
  min?: number
  max?: number
  pattern?: string
  patternMessage?: string
}

export interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
}

/** Cross-field rule: `field` must be a later date than `otherField`. */
export interface DateAfterRule {
  type: 'dateAfter'
  field: string
  otherField: string
  message: string
}

/** A predefined, reusable form. Stored as data; there is no form builder. */
export interface FormDefinition {
  id: string
  code: string
  title: string
  description?: string
  version: number
  sections: FormSection[]
  rules?: DateAfterRule[]
  createdAt: string
}

/** Checkbox values are booleans; everything else is kept as the entered string. */
export type FormValues = Record<string, string | boolean>
