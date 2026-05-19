import { createClient, Client } from '@libsql/client'
import path from 'path'

const DB_URL = process.env.TURSO_DATABASE_URL ?? `file:${path.join(process.cwd(), 'ecofin.db')}`
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN

let client: Client | null = null
let initialized = false

export function getDb(): Client {
  if (!client) {
    client = createClient({ url: DB_URL, authToken: DB_TOKEN })
  }
  return client
}

export async function ensureDb(): Promise<Client> {
  const db = getDb()
  if (!initialized) {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        limit_amount REAL NOT NULL,
        month TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    initialized = true
  }
  return db
}

export interface Transaction {
  id: number
  amount: number
  category: string
  description: string
  type: 'expense' | 'income'
  date: string
  created_at: string
}

export interface Goal {
  id: number
  category: string
  limit_amount: number
  month: string
}
