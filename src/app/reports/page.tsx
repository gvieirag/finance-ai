'use client'

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { ArrowLeft, TrendingDown, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface SummaryItem {
  category: string
  total_expense: number
  total_income: number
  count: number
}

interface Totals {
  total_expense: number
  total_income: number
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [totals, setTotals] = useState<Totals>({ total_expense: 0, total_income: 0 })
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/transactions?month=${month}`)
      .then(r => r.json())
      .then(data => {
        setSummary(data.summary || [])
        setTotals(data.totals || { total_expense: 0, total_income: 0 })
      })
      .finally(() => setLoading(false))
  }, [month])

  const expenseData = summary
    .filter(s => s.total_expense > 0)
    .map(s => ({ name: s.category, value: s.total_expense }))

  const barData = summary.map(s => ({
    name: s.category.length > 10 ? s.category.slice(0, 10) + '…' : s.category,
    Gastos: s.total_expense,
    Receitas: s.total_income,
  }))

  const balance = (totals.total_income || 0) - (totals.total_expense || 0)

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/" className="w-8 h-8 rounded-full bg-card flex items-center justify-center hover:bg-border transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-semibold">Relatórios</h1>
          <p className="text-xs text-slate-400">Visão geral financeira</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="ml-auto bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
        />
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-red-400" />
                <span className="text-xs text-slate-400">Gastos</span>
              </div>
              <p className="font-semibold text-red-400">
                R${(totals.total_expense || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-green-400" />
                <span className="text-xs text-slate-400">Receitas</span>
              </div>
              <p className="font-semibold text-green-400">
                R${(totals.total_income || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className={balance >= 0 ? 'text-primary' : 'text-red-400'} />
                <span className="text-xs text-slate-400">Saldo</span>
              </div>
              <p className={`font-semibold ${balance >= 0 ? 'text-primary' : 'text-red-400'}`}>
                R${balance.toFixed(2)}
              </p>
            </div>
          </div>

          {expenseData.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <p className="text-slate-400 text-sm">Nenhuma transação registrada neste mês.</p>
              <Link href="/" className="text-primary text-sm mt-2 inline-block hover:underline">
                Registrar pelo chat
              </Link>
            </div>
          ) : (
            <>
              {/* Gráfico de pizza */}
              <div className="bg-card rounded-xl p-4 border border-border mb-4">
                <h2 className="text-sm font-medium mb-4 text-slate-300">Gastos por Categoria</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {expenseData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`R$${value.toFixed(2)}`, 'Total']}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {expenseData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-400 truncate">{item.name}</span>
                      <span className="ml-auto text-slate-200">R${item.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico de barras */}
              {barData.length > 0 && (
                <div className="bg-card rounded-xl p-4 border border-border">
                  <h2 className="text-sm font-medium mb-4 text-slate-300">Comparativo por Categoria</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip
                        formatter={(value: number) => [`R$${value.toFixed(2)}`]}
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
