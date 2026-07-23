import { NextRequest, NextResponse } from "next/server"

interface LeadPayload {
  nome: string
  email: string
  whatsapp: string
  pontos: Record<string, number>
  frequencia: string
  gastoCartao: string
  maturidade: string
  // Campos calculados
  valorTotalReais: number
  totalPontos: number
  faixaDestino: string
  mql: boolean
  upgradeExecutivaAplicavel: boolean
  // UTMs
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  // Tracking params
  fbclid?: string
  gclid?: string
  referrer?: string
  fbp?: string
  fbc?: string
  client_user_agent?: string
}

function formatarFrequencia(v: string): string {
  const map: Record<string, string> = {
    "1-2": "1 a 2 vezes por ano",
    "3-5": "3 a 5 vezes por ano",
    "6+": "6 vezes ou mais por ano",
    raramente: "Raramente",
  }
  return map[v] ?? v
}

function formatarGastoCartao(v: string): string {
  const map: Record<string, string> = {
    "ate-5k": "Até R$ 5 mil",
    "5-15k": "R$ 5 a 15 mil",
    "15-30k": "R$ 15 a 30 mil",
    "acima-30k": "Acima de R$ 30 mil",
  }
  return map[v] ?? v
}

function formatarMaturidade(v: string): string {
  const map: Record<string, string> = {
    "nunca-estruturei": "Ninguém, nunca estruturei",
    "eu-mesmo": "Eu mesmo, quando dá tempo",
    "curso-pouco": "Fiz curso, aplico pouco",
    "quero-delegar": "Quero delegar de vez",
  }
  return map[v] ?? v
}

function formatarFaixaDestino(v: string): string {
  const map: Record<string, string> = {
    nacional: "Nacional",
    "internacional-economica": "Internacional Econômica",
    "internacional-executiva": "Internacional Executiva",
  }
  return map[v] ?? v
}

/**
 * CRM (Pipe) — fonte comercial real do lead. Se PIPE_WEBHOOK_URL não estiver
 * configurado (ambiente local/dev), apenas loga e considera sucesso simulado
 * para não travar o desenvolvimento; em produção a env var é obrigatória.
 */
async function sendPipe(payload: LeadPayload): Promise<{ simulated: boolean }> {
  const webhookUrl = process.env.PIPE_WEBHOOK_URL

  const body = {
    nome: payload.nome,
    email: payload.email,
    whatsapp: payload.whatsapp,

    pontos_por_programa: payload.pontos,
    frequencia_viagens: formatarFrequencia(payload.frequencia),
    gasto_mensal_cartao: formatarGastoCartao(payload.gastoCartao),
    maturidade_milhas: formatarMaturidade(payload.maturidade),

    valor_total_pontos_reais: payload.valorTotalReais,
    total_pontos: payload.totalPontos,
    faixa_destino: formatarFaixaDestino(payload.faixaDestino),
    mql: payload.mql,
    upgrade_executiva_aplicavel: payload.upgradeExecutivaAplicavel,

    data_lead: new Date().toISOString(),
    // Origem/tag própria da Página C — integrações de entrada hoje só existem
    // configuradas para as Páginas A e B, esta precisa ser criada no CRM.
    origem: "calculadora-pontos-c",

    utm_source: payload.utm_source ?? "",
    utm_medium: payload.utm_medium ?? "",
    utm_campaign: payload.utm_campaign ?? "",
    utm_term: payload.utm_term ?? "",
    utm_content: payload.utm_content ?? "",

    fbclid: payload.fbclid ?? "",
    gclid: payload.gclid ?? "",
    referrer: payload.referrer ?? "",
    fbp: payload.fbp ?? "",
    fbc: payload.fbc ?? "",
    client_user_agent: payload.client_user_agent ?? "",
  }

  if (!webhookUrl) {
    console.warn("[lead/api] PIPE_WEBHOOK_URL não configurado — lead não enviado ao CRM:", body)
    return { simulated: true }
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Pipe webhook retornou ${res.status}`)
  }

  return { simulated: false }
}

export async function POST(req: NextRequest) {
  try {
    const payload: LeadPayload = await req.json()

    if (!payload.email || !payload.nome || !payload.whatsapp) {
      return NextResponse.json({ ok: false, error: "Dados incompletos" }, { status: 400 })
    }

    const results = await Promise.allSettled([sendPipe(payload)])
    const pipeResult = results[0]

    if (pipeResult.status === "rejected") {
      console.error("[lead/api] Pipe error:", pipeResult.reason)
      // Pipe/CRM é a fonte comercial real do lead — se falhar, o lead NÃO é
      // considerado criado. generate_lead nunca deve disparar neste caso.
      return NextResponse.json({ ok: false, error: "crm_create_failed" }, { status: 502 })
    }

    return NextResponse.json({ ok: true, simulated: pipeResult.value.simulated })
  } catch (err) {
    console.error("[lead/api] Unexpected error:", err)
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 })
  }
}
