import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const DB_NAME = 'funlearn_db'
const DB_STORE = 'sqlite_db'
const DB_KEY = 'funlearn_sqlite'
const IDB_VERSION = 1

let SQL: SqlJsStatic | null = null
let db: Database | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const idb = request.result
      if (!idb.objectStoreNames.contains(DB_STORE)) {
        idb.createObjectStore(DB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  const idb = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readonly')
    const store = tx.objectStore(DB_STORE)
    const request = store.get(DB_KEY)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  const idb = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite')
    const store = tx.objectStore(DB_STORE)
    const request = store.put(data, DB_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function migrateAddUserId(database: Database) {
  const tablesNeedingUserId = [
    { table: 'learning_records', column: 'user_id' },
    { table: 'achievements', column: 'user_id' },
    { table: 'review_items', column: 'user_id' },
    { table: 'path_nodes', column: 'user_id' },
    { table: 'today_minutes', column: 'user_id' },
  ]

  for (const { table, column } of tablesNeedingUserId) {
    try {
      const info = database.prepare(`PRAGMA table_info(${table})`)
      const columns: string[] = []
      while (info.step()) {
        const row = info.getAsObject() as { name: string }
        columns.push(row.name)
      }
      info.free()

      if (!columns.includes(column)) {
        database.run(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`)

        const firstUser = database.prepare("SELECT id FROM users ORDER BY created_at LIMIT 1")
        let firstUserId = ''
        if (firstUser.step()) {
          const row = firstUser.getAsObject() as { id: string }
          firstUserId = row.id
        }
        firstUser.free()

        if (firstUserId) {
          database.run(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ''`, [firstUserId])
        }
      }
    } catch {
      // table may not exist yet
    }
  }
}

function migrateVoiceSettings(database: Database) {
  try {
    const info = database.prepare('PRAGMA table_info(voice_settings)')
    const columns: string[] = []
    while (info.step()) {
      const row = info.getAsObject() as { name: string }
      columns.push(row.name)
    }
    info.free()

    if (!columns.includes('engine')) {
      database.run("ALTER TABLE voice_settings ADD COLUMN engine TEXT NOT NULL DEFAULT 'browser'")
    }
    if (!columns.includes('role')) {
      database.run("ALTER TABLE voice_settings ADD COLUMN role TEXT NOT NULL DEFAULT 'adult_female'")
    }
  } catch {
    // table may not exist yet
  }
}

function createTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      stars INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS current_user (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id TEXT NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS learning_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module TEXT NOT NULL,
      topic TEXT NOT NULL,
      action TEXT NOT NULL,
      score INTEGER,
      stars_earned INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      unlocked INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS today_minutes (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      minutes REAL NOT NULL DEFAULT 0
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS custom_content (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS review_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 0,
      next_review INTEGER NOT NULL,
      last_review INTEGER,
      review_count INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      created_at INTEGER NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS path_nodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'locked',
      stars INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS parent_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      daily_time_limit INTEGER NOT NULL DEFAULT 30,
      session_time_limit INTEGER NOT NULL DEFAULT 10,
      enabled_modules TEXT NOT NULL DEFAULT '{}',
      password TEXT NOT NULL DEFAULT '123456'
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS shop_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      UNIQUE(user_id, item_id)
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS current_admin (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      admin_id INTEGER NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS voice_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id TEXT NOT NULL DEFAULT '',
      rate REAL NOT NULL DEFAULT 0.7,
      pitch REAL NOT NULL DEFAULT 1.0,
      gender TEXT NOT NULL DEFAULT 'female',
      tone TEXT NOT NULL DEFAULT 'gentle'
    )
  `)

  const checkStmt = database.prepare("SELECT COUNT(*) as cnt FROM admin_users")
  let adminExists = false
  if (checkStmt.step()) {
    const row = checkStmt.getAsObject() as { cnt: number }
    adminExists = row.cnt > 0
  }
  checkStmt.free()
  if (!adminExists) {
    database.run(
      "INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)",
      ['admin', '001ed085a638860c', new Date().toISOString()]
    )
  } else {
    database.run(
      "UPDATE admin_users SET password_hash = ? WHERE password_hash = ?",
      ['001ed085a638860c', '000fae2419705676']
    )
  }

  migrateAddUserId(database)
  migrateVoiceSettings(database)
}

export async function initDatabase(): Promise<Database> {
  if (db) return db

  SQL = await initSqlJs({
    locateFile: () => sqlWasmUrl,
  })

  const savedData = await loadFromIDB()
  if (savedData) {
    db = new SQL.Database(savedData)
  } else {
    db = new SQL.Database()
  }

  createTables(db)
  await persistDatabase()

  return db
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export async function persistDatabase(): Promise<void> {
  if (!db) return
  const data = db.export()
  await saveToIDB(data)
}

export function schedulePersist(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    persistDatabase().catch(console.error)
  }, 300)
}

export function run(sql: string, params?: unknown[]): void {
  const database = getDatabase()
  database.run(sql, params)
  schedulePersist()
}

export function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  const results: T[] = []
  if (params) stmt.bind(params)
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return results
}

export function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null {
  const results = query<T>(sql, params)
  return results.length > 0 ? results[0] : null
}
