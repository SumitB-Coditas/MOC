import { z } from 'zod'
import { STORAGE_KEYS } from '@/services/storage/keys'
import type { UserRecord } from '@/types/auth'
import { defineCollection } from './collection'

const userRecordSchema = z.object({
  id: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  passwordSalt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
}) satisfies z.ZodType<UserRecord>

export const usersCollection = defineCollection<UserRecord>(
  STORAGE_KEYS.users,
  userRecordSchema.parse,
)
