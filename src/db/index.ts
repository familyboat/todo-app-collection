import { openDB, type DBSchema, type IDBPDatabase } from "idb"

const DB_NAME = 'todo-app'
const DB_VERSION = 3

const objectStoreNames = ['native', 'react', 'preact', 'vue', 'lit', 'svelte', 'angular', 'solid'] as const

type TodoType = (typeof objectStoreNames)[number]

export interface TodoRecord {
  id: string
  content: string
  createdAt: number
  modifiedAt: number
  statusModifiedAt: number
  completed: boolean
}

type TodoStoreSchema = {
  key: string
  value: TodoRecord
  indexes: {
    statusModifiedAt: number
  }
}

interface TodoDB extends DBSchema {
  native: TodoStoreSchema
  react: TodoStoreSchema
  preact: TodoStoreSchema
  vue: TodoStoreSchema
  lit: TodoStoreSchema
  svelte: TodoStoreSchema
  angular: TodoStoreSchema
  solid: TodoStoreSchema
}

let db: IDBPDatabase<TodoDB> | null = null

export async function createDb(): Promise<IDBPDatabase<TodoDB>> {
  db = await openDB<TodoDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      objectStoreNames.forEach((storeName) => {
        const objectStore = database.createObjectStore(storeName, {
          keyPath: 'id',
        })

        objectStore.createIndex('statusModifiedAt', 'statusModifiedAt')
      })
    },
  })

  return db
}

export async function ensureDb(): Promise<IDBPDatabase<TodoDB>> {
  if (!db) {
    return createDb()
  }

  return db
}

export async function getAllTodoItems(todoType: TodoType): Promise<TodoRecord[]> {
  const database = await ensureDb()
  return database.getAllFromIndex(todoType, 'statusModifiedAt')
}

export async function createTodoItem(todoType: TodoType, todoItem: TodoRecord): Promise<void> {
  const database = await ensureDb()
  const transaction = database.transaction(todoType, 'readwrite')
  const store = transaction.objectStore(todoType)

  const existing = await store.get(todoItem.id)
  if (!existing) {
    await store.add(todoItem)
  }

  await transaction.done
}

export async function updateTodoItem(todoType: TodoType, todoItem: TodoRecord): Promise<void> {
  const database = await ensureDb()
  const transaction = database.transaction(todoType, 'readwrite')
  const store = transaction.objectStore(todoType)

  const existing = await store.get(todoItem.id)

  if (!existing) {
    throw new Error(`Can't make any operation with non-existent todo`)
  }

  Object.assign(existing, todoItem)
  await store.put(existing)
  await transaction.done
}
