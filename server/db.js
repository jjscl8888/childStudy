import pg from 'pg';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let usePostgres = true;
let sqliteDb = null;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'funlearn',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', () => {
  usePostgres = false;
});

async function initSqlite() {
  if (sqliteDb) return;
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'funlearn_server.db');
  sqliteDb = new Database(dbPath);

  // Migration: add email column for existing databases
  try {
    sqliteDb.exec(`ALTER TABLE users ADD COLUMN email TEXT UNIQUE;`);
  } catch {
    // Column already exists, ignore error
  }

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT 'default',
      email TEXT UNIQUE,
      stars INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'register',
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learning_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module TEXT NOT NULL,
      topic TEXT NOT NULL,
      action TEXT NOT NULL,
      score INTEGER,
      stars_earned INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      unlocked INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT,
      UNIQUE(user_id, code)
    );

    CREATE TABLE IF NOT EXISTS review_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 0,
      next_review TEXT NOT NULL,
      last_review TEXT,
      review_count INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, module_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS path_nodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'locked',
      stars INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      UNIQUE(user_id, module_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS custom_content (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parent_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      user_id TEXT NOT NULL,
      daily_time_limit INTEGER NOT NULL DEFAULT 30,
      session_time_limit INTEGER NOT NULL DEFAULT 10,
      enabled_modules TEXT NOT NULL DEFAULT '{}',
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS voice_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      user_id TEXT NOT NULL,
      rate REAL NOT NULL DEFAULT 0.7,
      pitch REAL NOT NULL DEFAULT 1.0,
      gender TEXT NOT NULL DEFAULT 'female',
      tone TEXT NOT NULL DEFAULT 'gentle',
      engine TEXT NOT NULL DEFAULT 'browser',
      role TEXT NOT NULL DEFAULT 'adult_female',
      edge_tts_voice TEXT NOT NULL DEFAULT 'zh-CN-XiaoxiaoNeural',
      edge_tts_rate INTEGER NOT NULL DEFAULT 0,
      edge_tts_pitch INTEGER NOT NULL DEFAULT 0,
      edge_tts_volume INTEGER NOT NULL DEFAULT 0,
      edge_tts_locale_filter TEXT NOT NULL DEFAULT 'zh-CN',
      edge_tts_gender_filter TEXT NOT NULL DEFAULT 'Female'
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_review_items_user ON review_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_path_nodes_user ON path_nodes(user_id, module_id);
  `);
}

export function isPostgres() {
  return usePostgres;
}

function pgToSqlite(text) {
  return text
    .replace(/\$\d+/g, '?')
    .replace(/RETURNING \*/gi, '')
    .replace(/RETURNING [^;]+/gi, '');
}

export async function query(text, params) {
  if (usePostgres) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch {
      usePostgres = false;
    }
  }

  await initSqlite();
  const sqliteText = pgToSqlite(text);
  const stmt = sqliteDb.prepare(sqliteText);

  if (sqliteText.trim().toLowerCase().startsWith('select')) {
    const rows = stmt.all(...(params || []));
    return { rows };
  } else {
    const result = stmt.run(...(params || []));
    return { rows: [], rowCount: result.changes };
  }
}

export async function queryOne(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

export async function getClient() {
  if (usePostgres) {
    try {
      return await pool.connect();
    } catch {
      usePostgres = false;
    }
  }

  await initSqlite();

  return {
    query: async (text, params) => {
      const sqliteText = pgToSqlite(text);
      const stmt = sqliteDb.prepare(sqliteText);
      if (sqliteText.trim().toLowerCase().startsWith('select')) {
        const rows = stmt.all(...(params || []));
        return { rows };
      } else {
        const result = stmt.run(...(params || []));
        return { rows: [], rowCount: result.changes };
      }
    },
    release: () => {},
  };
}

export default pool;
