import { CERTIFICATE_APPLICATION_FORM } from '@/domain/forms/certificateApplicationForm'
import type { Seeder } from './bootstrap'
import { STORAGE_KEYS } from './keys'

/** Mock data written once on first load (never overwrites existing data). */
export const APP_SEEDERS: Seeder[] = [
  {
    key: STORAGE_KEYS.forms,
    description: 'Predefined certificate application form',
    create: () => [CERTIFICATE_APPLICATION_FORM],
  },
]
