import { neon } from '@neondatabase/serverless'

export type Sql = ReturnType<typeof neon>

let sql: Sql | null = null

export function getDb(): Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL não definida')
    sql = neon(url)
  }
  return sql
}

export async function ensureDb(): Promise<Sql> {
  const db = getDb()
  await db`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      month TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(category, month)
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
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
