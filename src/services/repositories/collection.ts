import { AppError } from '@/lib/errors'
import type { StorageKey } from '@/services/storage/keys'
import type { Parser, StorageTransaction } from '@/services/storage/storageClient'

export interface Entity {
  id: string
}

/** Synchronous CRUD over one stored array. Holds no business rules. */
export interface CollectionRepository<T extends Entity> {
  list(): T[]
  findById(id: string): T | undefined
  find(predicate: (item: T) => boolean): T | undefined
  filter(predicate: (item: T) => boolean): T[]
  /** Throws `CONFLICT` if an item with the same id exists. */
  insert(item: T): T
  /** Shallow-merges `changes`; throws `NOT_FOUND` if the id is unknown. */
  update(id: string, changes: Partial<Omit<T, 'id'>>): T
  /** Throws `NOT_FOUND` if the id is unknown. */
  remove(id: string): void
}

export interface Collection<T extends Entity> {
  key: StorageKey
  /**
   * Binds the collection to a store: the app-wide client for single-key work, or a
   * transaction when several collections must change together.
   */
  repository(store: StorageTransaction): CollectionRepository<T>
}

/**
 * Describes a persisted collection of entities. A collection that must never lose records
 * (e.g. submissions) can expose `Omit<CollectionRepository<T>, 'remove'>` from its module.
 */
export function defineCollection<T extends Entity>(
  key: StorageKey,
  parseItem: Parser<T>,
): Collection<T> {
  const parseList: Parser<T[]> = (raw) => {
    if (!Array.isArray(raw)) throw new Error(`"${key}" must be an array`)
    return raw.map(parseItem)
  }

  return {
    key,
    repository(store) {
      const list = (): T[] => store.read(key, parseList) ?? []
      const save = (items: T[]): void => store.write(key, items)
      const notFound = (id: string) =>
        new AppError('NOT_FOUND', `No "${key}" record with id ${id}.`)

      return {
        list,
        findById: (id) => list().find((item) => item.id === id),
        find: (predicate) => list().find(predicate),
        filter: (predicate) => list().filter(predicate),

        insert(item) {
          const items = list()
          if (items.some((existing) => existing.id === item.id)) {
            throw new AppError('CONFLICT', `A "${key}" record with id ${item.id} already exists.`)
          }
          save([...items, item])
          return item
        },

        update(id, changes) {
          const items = list()
          const index = items.findIndex((item) => item.id === id)
          const current = items[index]
          if (!current) throw notFound(id)
          const updated: T = { ...current, ...changes, id }
          save(items.with(index, updated))
          return updated
        },

        remove(id) {
          const items = list()
          if (!items.some((item) => item.id === id)) throw notFound(id)
          save(items.filter((item) => item.id !== id))
        },
      }
    },
  }
}
