import { z } from 'zod'
import { profileFields } from '@/lib/validation'

/**
 * Admin profile edit. Uses the registration field rules. Strict: password, id, role and
 * any other key are rejected, because none of them is editable through this feature.
 */
export const updateProfileSchema = z.strictObject(profileFields)
export type UpdateProfileInput = z.input<typeof updateProfileSchema>

/** The edit form validates the same fields. */
export const editProfileFormSchema = z.object(profileFields)
