import { AppError } from '@/lib/errors'
import { SCHEMA_VERSION, STORAGE_KEYS } from './keys'
import type { Parser, StorageClient, StorageTransaction } from './storageClient'

export interface StorageMeta {
  schemaVersion: number
  createdAt: string
  migratedAt?: string
}

export const parseStorageMeta: Parser<StorageMeta> = (raw) => {
  if (typeof raw !== 'object' || raw === null) throw new Error('meta must be an object')
  const { schemaVersion, createdAt, migratedAt } = raw as Record<string, unknown>
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error('meta.schemaVersion must be a positive integer')
  }
  if (typeof createdAt !== 'string') throw new Error('meta.createdAt must be a string')
  if (migratedAt !== undefined && typeof migratedAt !== 'string') {
    throw new Error('meta.migratedAt must be a string')
  }
  return migratedAt === undefined
    ? { schemaVersion, createdAt }
    : { schemaVersion, createdAt, migratedAt }
}

/** Upgrades persisted data from `version - 1` to `version`. */
export interface Migration {
  version: number
  description: string
  up(tx: StorageTransaction): void
}

/** Ordered list of data migrations. Empty until the persisted shape first changes. */
export const MIGRATIONS: Migration[] = []

export interface MigrationOptions {
  migrations?: Migration[]
  targetVersion?: number
  now?: () => string
}

export type MigrationResult =
  | { status: 'initialized'; version: number }
  | { status: 'up-to-date'; version: number }
  | { status: 'migrated'; fromVersion: number; toVersion: number }

/**
 * Brings stored data up to `targetVersion`. A fresh browser is stamped with the target
 * version directly. Each migration runs in its own transaction together with its meta bump,
 * so an interrupted upgrade can resume from the last completed step.
 */
export function runMigrations(
  client: StorageClient,
  {
    migrations = MIGRATIONS,
    targetVersion = SCHEMA_VERSION,
    now = () => new Date().toISOString(),
  }: MigrationOptions = {},
): MigrationResult {
  const meta = client.read(STORAGE_KEYS.meta, parseStorageMeta)

  if (!meta) {
    client.write<StorageMeta>(STORAGE_KEYS.meta, {
      schemaVersion: targetVersion,
      createdAt: now(),
    })
    return { status: 'initialized', version: targetVersion }
  }

  if (meta.schemaVersion > targetVersion) {
    throw new AppError(
      'STORAGE_VERSION_UNSUPPORTED',
      `Stored data (v${meta.schemaVersion}) is newer than this app supports (v${targetVersion}).`,
    )
  }
  if (meta.schemaVersion === targetVersion) {
    return { status: 'up-to-date', version: targetVersion }
  }

  const pending = migrations
    .filter((m) => m.version > meta.schemaVersion && m.version <= targetVersion)
    .sort((a, b) => a.version - b.version)

  pending.forEach((migration, index) => {
    if (migration.version !== meta.schemaVersion + index + 1) {
      throw new Error(`Missing storage migration to v${meta.schemaVersion + index + 1}.`)
    }
  })
  if ((pending.at(-1)?.version ?? meta.schemaVersion) !== targetVersion) {
    throw new Error(`Missing storage migration to v${targetVersion}.`)
  }

  for (const migration of pending) {
    client.transaction((tx) => {
      migration.up(tx)
      tx.write<StorageMeta>(STORAGE_KEYS.meta, {
        ...meta,
        schemaVersion: migration.version,
        migratedAt: now(),
      })
    })
  }

  return { status: 'migrated', fromVersion: meta.schemaVersion, toVersion: targetVersion }
}
