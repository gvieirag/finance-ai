import { NextResponse } from 'next/server'
import { ensureDb, Transaction } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const db = await ensureDb()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    const [transactionsRes, summaryRes, totalsRes] = await Promise.all([
      db.execute({
        sql: `SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC, created_at DESC`,
        args: [month],
      }),
      db.execute({
        sql: `
          SELECT
            category,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            COUNT(*) as count
          FROM transactions
          WHERE strftime('%Y-%m', date) = ?
          GROUP BY category
          ORDER BY total_expense DESC
        `,
        args: [month],
      }),
      db.execute({
        sql: `
          SELECT
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income
          FROM transactions
          WHERE strftime('%Y-%m', date) = ?
        `,
        args: [month],
      }),
    ])

    const transactions = transactionsRes.rows as unknown as Transaction[]
    const summary = summaryRes.rows
    const totals = totalsRes.rows[0] ?? { total_expense: 0, total_income: 0 }

    return NextResponse.json({ transactions, summary, totals, month })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const db = await ensureDb()
    const { amount, category, description, type, date } = await request.json()

    const result = await db.execute({
      sql: `INSERT INTO transactions (amount, category, description, type, date) VALUES (?, ?, ?, ?, ?)`,
      args: [amount, category, description, type, date],
    })

    const row = await db.execute({
      sql: `SELECT * FROM transactions WHERE id = ?`,
      args: [result.lastInsertRowid!],
    })

    return NextResponse.json({ transaction: row.rows[0] }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao salvar transação' }, { status: 500 })
  }
}
