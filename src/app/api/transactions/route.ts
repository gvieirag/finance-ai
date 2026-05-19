import { NextResponse } from 'next/server'
import { ensureDb, Transaction } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const db = await ensureDb()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    const [transactions, summary, totalsRes] = await Promise.all([
      db`
        SELECT * FROM transactions
        WHERE TO_CHAR(date, 'YYYY-MM') = ${month}
        ORDER BY date DESC, created_at DESC
      `,
      db`
        SELECT
          category,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COUNT(*) as count
        FROM transactions
        WHERE TO_CHAR(date, 'YYYY-MM') = ${month}
        GROUP BY category
        ORDER BY total_expense DESC
      `,
      db`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income
        FROM transactions
        WHERE TO_CHAR(date, 'YYYY-MM') = ${month}
      `,
    ])

    const totals = totalsRes[0] ?? { total_expense: 0, total_income: 0 }

    return NextResponse.json({ transactions: transactions as unknown as Transaction[], summary, totals, month })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const db = await ensureDb()
    const { amount, category, description, type, date } = await request.json()

    const rows = await db`
      INSERT INTO transactions (amount, category, description, type, date)
      VALUES (${amount}, ${category}, ${description}, ${type}, ${date})
      RETURNING *
    `

    return NextResponse.json({ transaction: rows[0] }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao salvar transação' }, { status: 500 })
  }
}
