import { z } from 'zod'
import { STORAGE_KEYS } from '@/services/storage/keys'
import type { FormDefinition, FormValues } from '@/types/forms'
import { defineCollection } from './collection'

const formFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'date', 'number', 'select', 'checkbox']),
  required: z.boolean(),
  helpText: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
})

export const formDefinitionSchema = z.object({
  id: z.string().min(1),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  version: z.number(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      fields: z.array(formFieldSchema),
    }),
  ),
  rules: z
    .array(
      z.object({
        type: z.literal('dateAfter'),
        field: z.string(),
        otherField: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
  createdAt: z.string(),
}) satisfies z.ZodType<FormDefinition>

export const formValuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.boolean()]),
) satisfies z.ZodType<FormValues>

export const formsCollection = defineCollection<FormDefinition>(
  STORAGE_KEYS.forms,
  formDefinitionSchema.parse,
)
