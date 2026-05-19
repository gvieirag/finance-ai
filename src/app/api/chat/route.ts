import { NextResponse } from 'next/server'
import { processMessage } from '@/lib/claude'
import { ensureDb } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { message } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    const db = await ensureDb()
    const month = new Date().toISOString().slice(0, 7)

    const [totalsRes, categoriesRes, goalsRes] = await Promise.all([
      db`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COUNT(*) as count
        FROM transactions
        WHERE TO_CHAR(date, 'YYYY-MM') = ${month}
      `,
      db`
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense' AND TO_CHAR(date, 'YYYY-MM') = ${month}
        GROUP BY category ORDER BY total DESC LIMIT 5
      `,
      db`SELECT * FROM goals WHERE month = ${month}`,
    ])

    const totals = totalsRes[0] as { total_expense: number; total_income: number; count: number }
    const categories = categoriesRes as { category: string; total: number }[]
    const goals = goalsRes as { category: string; limit_amount: number }[]

    const monthSummary = Number(totals?.count) > 0
      ? `Mês atual (${month}): Total gasto R$${Number(totals.total_expense).toFixed(2)}, Receitas R$${Number(totals.total_income).toFixed(2)}.` +
        (categories.length ? ` Top categorias: ${categories.map(c => `${c.category} R$${Number(c.total).toFixed(2)}`).join(', ')}.` : '') +
        (goals.length ? ` Metas: ${goals.map(g => `${g.category} limite R$${g.limit_amount}`).join(', ')}.` : '')
      : ''

    await db`INSERT INTO messages (role, content) VALUES ('user', ${message})`

    const parsed = await processMessage(message, { monthSummary, goals: '' })

    if (parsed.action === 'register_transaction' && parsed.transaction) {
      const t = parsed.transaction
      await db`
        INSERT INTO transactions (amount, category, description, type, date)
        VALUES (${t.amount}, ${t.category}, ${t.description}, ${t.type}, ${t.date})
      `
      const goal = goals.find(g => g.category.toLowerCase() === t.category.toLowerCase())
      if (goal && t.type === 'expense') {
        const spentRes = await db`
          SELECT COALESCE(SUM(amount), 0) as total FROM transactions
          WHERE category = ${t.category} AND type = 'expense' AND TO_CHAR(date, 'YYYY-MM') = ${month}
        `
        const spent = Number((spentRes[0] as { total: number }).total)
        const percentage = (spent / goal.limit_amount) * 100
        if (percentage >= 80) {
          parsed.response += `\n\n⚠️ Atenção: você já usou ${percentage.toFixed(0)}% do limite de R$${goal.limit_amount} em ${t.category}.`
        }
      }
    } else if (parsed.action === 'set_goal' && parsed.goal) {
      const g = parsed.goal
      await db`
        INSERT INTO goals (category, limit_amount, month) VALUES (${g.category}, ${g.limit_amount}, ${g.month || month})
        ON CONFLICT (category, month) DO UPDATE SET limit_amount = EXCLUDED.limit_amount
      `
    }

    await db`INSERT INTO messages (role, content) VALUES ('assistant', ${parsed.response})`

    return NextResponse.json({ response: parsed.response, action: parsed.action })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao processar mensagem' }, { status: 500 })
  }
}
