import { z } from 'zod'
import { STORAGE_KEYS } from '@/services/storage/keys'
import type { FormAssignment } from '@/types/certification'
import { defineCollection } from './collection'
import { formValuesSchema } from './forms'

const assignmentSchema = z.object({
  id: z.string().min(1),
  userId: z.string(),
  formDefinitionId: z.string(),
  formVersion: z.number(),
  purpose: z.enum(['INITIAL', 'RENEWAL']),
  periodId: z.string().optional(),
  cycleNumber: z.number().optional(),
  status: z.enum(['ASSIGNED', 'DRAFT', 'SUBMITTED', 'CANCELLED']),
  draft: z.object({ values: formValuesSchema, savedAt: z.string() }).optional(),
  assignedAt: z.string(),
  submittedAt: z.string().optional(),
  submissionId: z.string().optional(),
  cancelledAt: z.string().optional(),
  updatedAt: z.string(),
}) satisfies z.ZodType<FormAssignment>

export const assignmentsCollection = defineCollection<FormAssignment>(
  STORAGE_KEYS.assignments,
  assignmentSchema.parse,
)
