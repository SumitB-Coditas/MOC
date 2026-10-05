/**
 * The single preconfigured Admin account for this frontend-only demo.
 *
 * Every credential check and every UI hint reads from here; nothing else hardcodes them.
 * In a real deployment the Admin would be authenticated by the backend, and this file would
 * be deleted.
 */
export const ADMIN_ACCOUNT = {
  id: 'admin',
  email: 'admin@cms.local',
  password: 'Admin@123',
  firstName: 'System',
  lastName: 'Administrator',
} as const
