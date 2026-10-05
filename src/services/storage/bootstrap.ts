import type { StorageKey } from './keys'
import { runMigrations, type MigrationOptions, type MigrationResult } from './migrations'
import type { StorageClient } from './storageClient'

/** Initial mock data for one key, written only if the key is absent (never overwrites). */
export interface Seeder {
  key: StorageKey
  description: string
  create: () => unknown
}

/** Default: no seeders. The app passes its own (`services/storage/seeders.ts`) at start-up. */
export const SEEDERS: Seeder[] = []

export interface BootstrapOptions extends MigrationOptions {
  seeders?: Seeder[]
}

export interface BootstrapResult {
  migration: MigrationResult
  seededKeys: StorageKey[]
}

/** Prepares persisted data before the first render: run migrations, then seed missing keys. */
export function bootstrapStorage(
  client: StorageClient,
  { seeders = SEEDERS, ...migrationOptions }: BootstrapOptions = {},
): BootstrapResult {
  const migration = runMigrations(client, migrationOptions)

  const seededKeys: StorageKey[] = []
  for (const seeder of seeders) {
    if (client.has(seeder.key)) continue
    client.write(seeder.key, seeder.create())
    seededKeys.push(seeder.key)
  }

  return { migration, seededKeys }
}
