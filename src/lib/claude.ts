// Parser de linguagem natural baseado em regras — sem API externa

export interface ParsedTransaction {
  action: 'register_transaction' | 'query_summary' | 'set_goal' | 'general_response'
  transaction?: {
    amount: number
    category: string
    description: string
    type: 'expense' | 'income'
    date: string
  }
  goal?: {
    category: string
    limit_amount: number
    month: string
  }
  response: string
}

// Mapeamento de palavras-chave para categorias
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: 'Alimentação', keywords: ['pizza', 'lanche', 'almoço', 'jantar', 'café', 'restaurante', 'ifood', 'delivery', 'comida', 'mercado', 'supermercado', 'padaria', 'hamburguer', 'sushi', 'açaí', 'sorvete', 'snack', 'refeição', 'marmita'] },
  { category: 'Transporte', keywords: ['uber', '99', 'taxi', 'ônibus', 'metrô', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'passagem', 'moto', 'bicicleta', 'transporte', 'carro', 'posto'] },
  { category: 'Saúde', keywords: ['farmácia', 'remédio', 'médico', 'consulta', 'exame', 'hospital', 'dentista', 'academia', 'plano de saúde', 'saúde', 'vitamina', 'suplemento'] },
  { category: 'Lazer', keywords: ['cinema', 'show', 'teatro', 'bar', 'balada', 'festa', 'viagem', 'hotel', 'netflix', 'spotify', 'disney', 'jogo', 'game', 'lazer', 'diversão', 'passeio'] },
  { category: 'Compras', keywords: ['roupa', 'sapato', 'tênis', 'camisa', 'calça', 'amazon', 'magazine', 'americanas', 'shopee', 'aliexpress', 'presente', 'compra', 'loja', 'shopping'] },
  { category: 'Moradia', keywords: ['aluguel', 'condomínio', 'água', 'luz', 'energia', 'internet', 'telefone', 'gás', 'iptu', 'reforma', 'manutenção', 'mobília', 'moradia'] },
  { category: 'Educação', keywords: ['curso', 'faculdade', 'escola', 'livro', 'udemy', 'alura', 'mensalidade', 'aula', 'estudo', 'educação', 'material'] },
  { category: 'Receita', keywords: ['salário', 'freelance', 'recebi', 'pagamento', 'transferência', 'pix recebido', 'renda', 'ganho', 'bônus', 'dividendo'] },
]

// Palavras que indicam receita (entrada de dinheiro)
const INCOME_KEYWORDS = ['recebi', 'salário', 'ganhei', 'entrou', 'pagamento recebido', 'renda', 'freelance', 'bônus']

// Palavras que indicam consulta de saldo/gastos (só sem valor monetário)
const QUERY_KEYWORDS = ['resumo', 'saldo', 'relatório', 'balanço', 'extrato', 'histórico', 'quanto gastei', 'quanto gasto', 'quanto foi', 'o que gastei', 'meu gasto', 'meus gastos']

// Palavras que indicam definição de meta
const GOAL_KEYWORDS = ['meta', 'limite', 'não gastar mais', 'budget', 'orçamento', 'gastar no máximo']

function extractAmount(text: string): number | null {
  // Padrões com unidade monetária explícita (prioridade)
  const explicitPatterns = [
    /r\$\s*(\d+(?:[.,]\d{1,2})?)/i,
    /(\d+(?:[.,]\d{1,2})?)\s*reais/i,
    /(\d+(?:[.,]\d{1,2})?)\s*conto/i,
    /(\d+(?:[.,]\d{1,2})?)\s*real/i,
    /(\d+(?:[.,]\d{1,2})?)\s*mangos?/i,
    /(\d+(?:[.,]\d{1,2})?)\s*pila/i,
  ]
  for (const pattern of explicitPatterns) {
    const match = text.match(pattern)
    if (match) return parseFloat(match[1].replace(',', '.'))
  }

  // Fallback: qualquer número no texto (ex: "gastei 50 no uber")
  const numberMatch = text.match(/\b(\d+(?:[.,]\d{1,2})?)\b/)
  if (numberMatch) {
    const val = parseFloat(numberMatch[1].replace(',', '.'))
    if (val > 0 && val < 1000000) return val
  }

  return null
}

function extractCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.category
    }
  }
  return 'Outros'
}

function extractDate(text: string): string {
  const today = new Date()
  const lower = text.toLowerCase()

  if (lower.includes('ontem')) {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }
  if (lower.includes('anteontem')) {
    const d = new Date(today)
    d.setDate(today.getDate() - 2)
    return d.toISOString().split('T')[0]
  }

  // Padrão DD/MM ou DD/MM/YYYY
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0')
    const month = dateMatch[2].padStart(2, '0')
    const year = dateMatch[3]
      ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3])
      : today.getFullYear().toString()
    return `${year}-${month}-${day}`
  }

  return today.toISOString().split('T')[0]
}

function isIncome(text: string): boolean {
  const lower = text.toLowerCase()
  return INCOME_KEYWORDS.some(kw => lower.includes(kw))
}

function isQuery(text: string): boolean {
  const lower = text.toLowerCase()
  return QUERY_KEYWORDS.some(kw => lower.includes(kw))
}

function isGoal(text: string): boolean {
  const lower = text.toLowerCase()
  return GOAL_KEYWORDS.some(kw => lower.includes(kw))
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function processMessage(
  userMessage: string,
  context: { monthSummary?: string; goals?: string }
): Promise<ParsedTransaction> {
  const text = userMessage.trim()
  const amount = extractAmount(text)

  // Se tem valor → sempre tenta registrar transação primeiro
  if (amount) {
    const type = isIncome(text) ? 'income' : 'expense'
    const category = type === 'income' ? 'Receita' : extractCategory(text)
    const date = extractDate(text)
    const description = text.length > 60 ? text.slice(0, 60) + '…' : text
    const emoji = type === 'income' ? '💰' : '✅'
    const typeLabel = type === 'income' ? 'Receita' : 'Gasto'

    return {
      action: 'register_transaction',
      transaction: { amount, category, description, type, date },
      response: `${emoji} Registrado!\n\n${typeLabel}: ${formatCurrency(amount)}\nCategoria: ${category}\nData: ${date.split('-').reverse().join('/')}`,
    }
  }

  // --- Consulta de gastos ---
  if (isQuery(text)) {
    if (context.monthSummary) {
      return {
        action: 'query_summary',
        response: `Aqui está seu resumo do mês:\n\n${context.monthSummary}\n\nAcesse a aba Relatórios para ver os gráficos detalhados! 📊`,
      }
    }
    return {
      action: 'query_summary',
      response: 'Você ainda não tem transações registradas este mês. Que tal começar registrando um gasto? 😊',
    }
  }

  // --- Definição de meta ---
  if (isGoal(text)) {
    const amount = extractAmount(text)
    const category = extractCategory(text)
    const month = new Date().toISOString().slice(0, 7)

    if (amount) {
      return {
        action: 'set_goal',
        goal: { category, limit_amount: amount, month },
        response: `Meta definida! Vou te avisar quando você chegar perto de ${formatCurrency(amount)} em ${category}. 🎯`,
      }
    }
    return {
      action: 'general_response',
      response: 'Para definir uma meta, me diga o valor. Ex: "Não gastar mais de 300 reais em lazer".',
    }
  }


  // --- Resposta genérica ---
  const helps = [
    'Você pode me dizer coisas como:',
    '• "Gastei 45 reais com pizza hoje"',
    '• "Paguei Uber 18 reais ontem"',
    '• "Recebi meu salário 3000 reais"',
    '• "Quanto gastei esse mês?"',
    '• "Meta: não gastar mais de 200 em lazer"',
  ]
  return {
    action: 'general_response',
    response: `Não entendi muito bem. ${helps.join('\n')}`,
  }
}
