'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, TrendingUp, Bot, User } from 'lucide-react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: 'Olá! Sou o EcoFin AI, seu assistente financeiro. 👋\n\nVocê pode me dizer coisas como:\n• "Gastei 45 reais com pizza hoje"\n• "Paguei Uber 18 reais"\n• "Quanto gastei esse mês?"\n• "Não gastar mais de 300 em lazer"\n\nComo posso te ajudar?',
  timestamp: new Date(),
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()

      const botMsg: Message = {
        role: 'assistant',
        content: data.error ? 'Desculpe, tive um problema. Tente novamente.' : data.response,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro de conexão. Tente novamente.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot size={16} />
          </div>
          <div>
            <h1 className="font-semibold text-sm">EcoFin AI</h1>
            <p className="text-xs text-slate-400">Assistente financeiro</p>
          </div>
        </div>
        <Link
          href="/reports"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors px-3 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60"
        >
          <TrendingUp size={14} />
          Relatórios
        </Link>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant' ? 'bg-primary' : 'bg-slate-600'
            }`}>
              {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'assistant'
                ? 'bg-card text-slate-100 rounded-tl-sm'
                : 'bg-primary text-white rounded-tr-sm'
            }`}>
              {msg.content}
              <div className={`text-xs mt-1 ${msg.role === 'assistant' ? 'text-slate-500' : 'text-green-200'}`}>
                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot size={14} />
            </div>
            <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Gastei 45 reais com almoço hoje..."
            rows={1}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors placeholder-slate-500"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}
