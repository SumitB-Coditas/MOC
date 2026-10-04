import { describe, expect, it } from 'vitest'
import { AppError } from '@/lib/errors'
import { bootstrapStorage } from './bootstrap'
import { createMemoryStore } from './keyValueStore'
import { STORAGE_KEYS } from './keys'
import { parseStorageMeta, runMigrations, type Migration } from './migrations'
import { createStorageClient, type Parser } from './storageClient'

const NOW = '2026-10-04T10:00:00.000Z'
const now = () => NOW
const parseStrings: Parser<string[]> = (raw) => raw as string[]

function setup() {
  return createStorageClient(createMemoryStore())
}

function readMeta(client: ReturnType<typeof setup>) {
  return client.read(STORAGE_KEYS.meta, parseStorageMeta)
}

describe('runMigrations', () => {
  it('stamps a fresh store with the target version', () => {
    const client = setup()
    expect(runMigrations(client, { targetVersion: 3, now })).toEqual({
      status: 'initialized',
      version: 3,
    })
    expect(readMeta(client)).toEqual({ schemaVersion: 3, createdAt: NOW })
  })

  it('does nothing when already at the target version', () => {
    const client = setup()
    runMigrations(client, { targetVersion: 1, now })
    expect(runMigrations(client, { targetVersion: 1, now }).status).toBe('up-to-date')
  })

  it('runs pending migrations in order and records the new version', () => {
    const client = setup()
    runMigrations(client, { targetVersion: 1, now })
    const log: number[] = []
    const migrations: Migration[] = [
      { version: 3, description: 'third', up: () => void log.push(3) },
      {
        version: 2,
        description: 'second',
        up: (tx) => {
          log.push(2)
          tx.write(STORAGE_KEYS.users, ['migrated'])
        },
      },
    ]

    const result = runMigrations(client, { migrations, targetVersion: 3, now })

    expect(result).toEqual({ status: 'migrated', fromVersion: 1, toVersion: 3 })
    expect(log).toEqual([2, 3])
    expect(client.read(STORAGE_KEYS.users, parseStrings)).toEqual(['migrated'])
    expect(readMeta(client)).toMatchObject({ schemaVersion: 3, migratedAt: NOW })
  })

  it('keeps completed steps when a later migration fails', () => {
    const client = setup()
    runMigrations(client, { targetVersion: 1, now })
    const migrations: Migration[] = [
      { version: 2, description: 'ok', up: (tx) => tx.write(STORAGE_KEYS.users, ['v2']) },
      {
        version: 3,
        description: 'fails',
        up: (tx) => {
          tx.write(STORAGE_KEYS.users, ['v3'])
          throw new Error('boom')
        },
      },
    ]

    expect(() => runMigrations(client, { migrations, targetVersion: 3, now })).toThrow('boom')
    expect(readMeta(client)?.schemaVersion).toBe(2)
    expect(client.read(STORAGE_KEYS.users, parseStrings)).toEqual(['v2'])
  })

  it('refuses data written by a newer app version', () => {
    const client = setup()
    runMigrations(client, { targetVersion: 5, now })
    expect(() => runMigrations(client, { targetVersion: 2, now })).toThrow(AppError)
  })

  it('fails loudly when a migration step is missing', () => {
    const client = setup()
    runMigrations(client, { targetVersion: 1, now })
    const migrations: Migration[] = [{ version: 3, description: 'gap', up: () => {} }]
    expect(() => runMigrations(client, { migrations, targetVersion: 3, now })).toThrow(
      'Missing storage migration to v2.',
    )
  })

  it('throws STORAGE_CORRUPTED for malformed meta', () => {
    const client = setup()
    client.write(STORAGE_KEYS.meta, { schemaVersion: 'one' })
    expect(() => runMigrations(client, { now })).toThrow(
      expect.objectContaining({ code: 'STORAGE_CORRUPTED' }),
    )
  })
})

describe('bootstrapStorage', () => {
  it('seeds missing keys only and never overwrites existing data', () => {
    const client = setup()
    client.write(STORAGE_KEYS.users, ['existing'])

    const result = bootstrapStorage(client, {
      now,
      seeders: [
        { key: STORAGE_KEYS.users, description: 'users', create: () => ['seeded'] },
        { key: STORAGE_KEYS.forms, description: 'forms', create: () => ['template'] },
      ],
    })

    expect(result.seededKeys).toEqual([STORAGE_KEYS.forms])
    expect(client.read(STORAGE_KEYS.users, parseStrings)).toEqual(['existing'])
    expect(client.read(STORAGE_KEYS.forms, parseStrings)).toEqual(['template'])
  })

  it('is idempotent across app starts', () => {
    const client = setup()
    const seeders = [{ key: STORAGE_KEYS.forms, description: 'forms', create: () => ['t'] }]
    bootstrapStorage(client, { now, seeders })
    const second = bootstrapStorage(client, { now, seeders })

    expect(second.migration.status).toBe('up-to-date')
    expect(second.seededKeys).toEqual([])
  })
})
