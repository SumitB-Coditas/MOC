import { z } from 'zod'
import { STORAGE_KEYS } from '@/services/storage/keys'
import type { StorageTransaction } from '@/services/storage/storageClient'
import type { Submission } from '@/types/certification'
import type { CollectionRepository } from './collection'
import { defineCollection } from './collection'
import { formDefinitionSchema, formValuesSchema } from './forms'

const submissionSchema = z.object({
  id: z.string().min(1),
  assignmentId: z.string(),
  userId: z.string(),
  purpose: z.enum(['INITIAL', 'RENEWAL']),
  periodId: z.string(),
  cycleNumber: z.number(),
  formSnapshot: formDefinitionSchema,
  applicantSnapshot: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    dateOfBirth: z.string(),
  }),
  values: formValuesSchema,
  submittedAt: z.string(),
  submittedOnDate: z.string(),
  isLate: z.boolean(),
}) satisfies z.ZodType<Submission>

const collection = defineCollection<Submission>(STORAGE_KEYS.submissions, submissionSchema.parse)

/** Submissions are append-only history (rule C6): this repository has no update or remove. */
export type SubmissionsRepository = Omit<CollectionRepository<Submission>, 'update' | 'remove'>

export const submissionsCollection = {
  key: collection.key,
  repository(store: StorageTransaction): SubmissionsRepository {
    const { list, findById, find, filter, insert } = collection.repository(store)
    return { list, findById, find, filter, insert }
  },
}
