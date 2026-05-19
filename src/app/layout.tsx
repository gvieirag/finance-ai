import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EcoFin AI — Finanças Pessoais',
  description: 'Assistente de finanças por linguagem natural',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-surface text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
