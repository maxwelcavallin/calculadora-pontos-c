export type Frequencia = "1-2" | "3-5" | "6+" | "raramente"
export type GastoCartao = "ate-5k" | "5-15k" | "15-30k" | "acima-30k"
export type Maturidade = "nunca-estruturei" | "eu-mesmo" | "curso-pouco" | "quero-delegar"

export type Programa = "livelo" | "latamPass" | "smiles" | "esfera" | "tudoAzul"

export type PontosPorPrograma = Record<Programa, number>

export interface CalculadoraFormData {
  pontos: PontosPorPrograma
  frequencia: Frequencia
  gastoCartao: GastoCartao
  maturidade: Maturidade
  nome: string
  whatsapp: string
  email: string
}

export type FaixaDestino = "nacional" | "internacional-economica" | "internacional-executiva"

export interface CalculadoraResult {
  nome: string
  valorTotalReais: number
  totalPontos: number
  faixaDestino: FaixaDestino
  mql: boolean
  upgradeExecutivaAplicavel: boolean
  ctaLabel: string
}

/**
 * ======================================================================
 * TABELAS DE REFERÊNCIA — validadas em 2026-07-23
 * ======================================================================
 * Valor por 1.000 pontos: R$ 20, único para todos os programas — mesma
 * referência já usada em produção na Página A (v0-diagnostico-de-viagens/
 * lib/diagnostico.ts). Não existe hoje uma quebra de valor por programa
 * (Livelo/Latam Pass/Smiles/Esfera/TudoAzul); se o time decidir diferenciar
 * no futuro, substituir a constante abaixo por um Record<Programa, number>.
 *
 * Limiares de faixa de destino: adaptados dos 8 tiers reais já usados na
 * calculadora de milhas do site institucional (v0-blue-sky-website-design/
 * lib/calculator.ts), agrupados nos 3 buckets do briefing da Página C:
 *   - Internacional Econômica = união dos tiers 50k/70k/100k-140k (todos
 *     rotulados "Econômica" na fonte)
 *   - Internacional Executiva = a partir de 140k, onde a fonte passa a
 *     misturar Econômica/Executiva
 * O limiar de "Nacional" não existe na fonte (o menor tier de lá já começa
 * em 50k, como internacional econômica) — não há piso mínimo de pontos
 * para Nacional porque ela nunca é ocultada, é sempre a faixa-base.
 * ======================================================================
 */

// Valor em reais por 1.000 pontos — único para todos os programas.
const VALOR_POR_MIL_PONTOS = 20

// Pontos mínimos (somando todos os programas informados) para sustentar
// cada faixa de viagem. Nacional é sempre a base — nunca é preciso
// atingir um limiar para ela, todo saldo cai em ao menos essa faixa.
const LIMIAR_PONTOS: Record<Exclude<FaixaDestino, "nacional">, number> = {
  "internacional-economica": 50000,
  "internacional-executiva": 140000,
}

// Chance real de upgrade de cabine: acima deste patamar de pontos já dá
// pra considerar a mensagem de upgrade como aplicável — ligado ao mesmo
// limiar da Internacional Econômica.
const LIMIAR_UPGRADE_EXECUTIVA = LIMIAR_PONTOS["internacional-economica"]

export const programaLabels: Record<Programa, string> = {
  livelo: "Livelo",
  latamPass: "Latam Pass",
  smiles: "Smiles",
  esfera: "Esfera",
  tudoAzul: "TudoAzul",
}

function freqAlta(frequencia: Frequencia): boolean {
  return frequencia === "3-5" || frequencia === "6+"
}

export function totalPontos(pontos: PontosPorPrograma): number {
  return Object.values(pontos).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0)
}

export function algumProgramaPreenchido(pontos: PontosPorPrograma): boolean {
  return Object.values(pontos).some((v) => v > 0)
}

function calcularValorReais(pontos: PontosPorPrograma): number {
  const total = (totalPontos(pontos) / 1000) * VALOR_POR_MIL_PONTOS
  return Math.round(total / 10) * 10
}

/** Sempre retorna a faixa mais alta que o saldo permite sustentar — nunca oculta a Nacional. */
function classificarFaixaDestino(pontos: number): FaixaDestino {
  if (pontos >= LIMIAR_PONTOS["internacional-executiva"]) return "internacional-executiva"
  if (pontos >= LIMIAR_PONTOS["internacional-economica"]) return "internacional-economica"
  return "nacional"
}

function classificarMql(data: Pick<CalculadoraFormData, "gastoCartao" | "frequencia" | "maturidade">): boolean {
  const cartao15Mais = data.gastoCartao === "15-30k" || data.gastoCartao === "acima-30k"
  const perfilDelegador =
    data.maturidade === "nunca-estruturei" || data.maturidade === "quero-delegar"
  return cartao15Mais || (freqAlta(data.frequencia) && perfilDelegador)
}

export function calcularResultado(data: CalculadoraFormData): CalculadoraResult {
  const pontos = totalPontos(data.pontos)
  const faixaDestino = classificarFaixaDestino(pontos)
  const mql = classificarMql(data)

  return {
    nome: data.nome,
    valorTotalReais: calcularValorReais(data.pontos),
    totalPontos: pontos,
    faixaDestino,
    mql,
    upgradeExecutivaAplicavel: pontos >= LIMIAR_UPGRADE_EXECUTIVA,
    ctaLabel: mql ? "Escolher meu horário agora" : "Agendar minha devolutiva",
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

// Buckets padronizados para tracking — nunca o valor bruto declarado no dataLayer.
export const frequenciaBucketMap: Record<Frequencia, string> = {
  "1-2": "1_2_year",
  "3-5": "3_5_year",
  "6+": "6_plus_year",
  raramente: "rarely",
}

export const gastoCartaoBucketMap: Record<GastoCartao, string> = {
  "ate-5k": "up_to_5k",
  "5-15k": "5k_15k",
  "15-30k": "15k_30k",
  "acima-30k": "above_30k",
}

export const maturidadeBucketMap: Record<Maturidade, string> = {
  "nunca-estruturei": "never_structured",
  "eu-mesmo": "self_managed",
  "curso-pouco": "trained_low_usage",
  "quero-delegar": "wants_to_delegate",
}

/** Bucket de faixa de total de pontos — nunca o valor exato declarado no dataLayer. */
export function totalPontosBucket(pontos: number): string {
  if (pontos <= 0) return "none"
  if (pontos < 5000) return "up_to_5k"
  if (pontos < 20000) return "5k_20k"
  if (pontos < 50000) return "20k_50k"
  if (pontos < 120000) return "50k_120k"
  return "above_120k"
}

export const faixaDestinoLabels: Record<FaixaDestino, string> = {
  nacional: "Nacional",
  "internacional-economica": "Internacional Econômica",
  "internacional-executiva": "Internacional Executiva",
}
