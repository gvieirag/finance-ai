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

    // Busca contexto do mês para o Claude
    const [totalsRes, categoriesRes, goalsRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            COUNT(*) as count
          FROM transactions WHERE strftime('%Y-%m', date) = ?
        `,
        args: [month],
      }),
      db.execute({
        sql: `
          SELECT category, SUM(amount) as total
          FROM transactions
          WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
          GROUP BY category ORDER BY total DESC LIMIT 5
        `,
        args: [month],
      }),
      db.execute({ sql: `SELECT * FROM goals WHERE month = ?`, args: [month] }),
    ])

    const totals = totalsRes.rows[0] as { total_expense: number; total_income: number; count: number } | undefined
    const categories = categoriesRes.rows as { category: string; total: number }[]
    const goals = goalsRes.rows as { category: string; limit_amount: number }[]

    const monthSummary = totals && Number(totals.count) > 0
      ? `Mês atual (${month}): Total gasto R$${Number(totals.total_expense).toFixed(2)}, Receitas R$${Number(totals.total_income).toFixed(2)}.` +
        (categories.length ? ` Top categorias: ${categories.map(c => `${c.category} R$${Number(c.total).toFixed(2)}`).join(', ')}.` : '') +
        (goals.length ? ` Metas: ${goals.map(g => `${g.category} limite R$${g.limit_amount}`).join(', ')}.` : '')
      : ''

    // Salva mensagem do usuário
    await db.execute({ sql: `INSERT INTO messages (role, content) VALUES (?, ?)`, args: ['user', message] })

    // Processa com Claude
    const parsed = await processMessage(message, { monthSummary, goals: '' })

    // Ação baseada no resultado
    if (parsed.action === 'register_transaction' && parsed.transaction) {
      const t = parsed.transaction
      await db.execute({
        sql: `INSERT INTO transactions (amount, category, description, type, date) VALUES (?, ?, ?, ?, ?)`,
        args: [t.amount, t.category, t.description, t.type, t.date],
      })

      // Verifica metas
      const goal = goals.find(g => g.category.toLowerCase() === t.category.toLowerCase())
      if (goal && t.type === 'expense') {
        const spentRes = await db.execute({
          sql: `SELECT SUM(amount) as total FROM transactions WHERE category = ? AND type = 'expense' AND strftime('%Y-%m', date) = ?`,
          args: [t.category, month],
        })
        const spent = Number((spentRes.rows[0] as { total: number }).total)
        const percentage = (spent / goal.limit_amount) * 100
        if (percentage >= 80) {
          parsed.response += `\n\n⚠️ Atenção: você já usou ${percentage.toFixed(0)}% do limite de R$${goal.limit_amount} em ${t.category}.`
        }
      }
    } else if (parsed.action === 'set_goal' && parsed.goal) {
      const g = parsed.goal
      await db.execute({
        sql: `INSERT OR REPLACE INTO goals (category, limit_amount, month) VALUES (?, ?, ?)`,
        args: [g.category, g.limit_amount, g.month || month],
      })
    }

    // Salva resposta do assistente
    await db.execute({ sql: `INSERT INTO messages (role, content) VALUES (?, ?)`, args: ['assistant', parsed.response] })

    return NextResponse.json({ response: parsed.response, action: parsed.action })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao processar mensagem' }, { status: 500 })
  }
}
