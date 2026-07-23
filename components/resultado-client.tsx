"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { formatCurrency, type CalculadoraResult } from "@/lib/calculadora"
import { pushToDataLayer } from "@/lib/tracking"

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
const YCBM_DOMAIN = process.env.NEXT_PUBLIC_YCBM_DOMAIN

// Destinos-exemplo por faixa — texto do briefing original da Página C,
// consistente com os tiers reais de lib/calculadora.ts (validado em 2026-07-23).
const destinoTextoPorFaixa: Record<CalculadoraResult["faixaDestino"], string> = {
  nacional: "Rio, Fortaleza, Foz do Iguaçu. Ida e volta, sem pagar praticamente nada além das taxas.",
  "internacional-economica": "Buenos Aires, Santiago, até Lisboa em conexão. De graça, ou quase.",
  "internacional-executiva": "Dá pra fazer Europa ou EUA de executiva sem tirar um real do bolso além das taxas.",
}

export default function ResultadoClient() {
  const router = useRouter()
  const [resultado, setResultado] = useState<CalculadoraResult | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem("calculadora_c_resultado")
    if (!raw) {
      router.replace("/")
      return
    }
    try {
      const parsed: CalculadoraResult = JSON.parse(raw)
      setResultado(parsed)
      pushToDataLayer("calculadora_c_result_view", {
        action_name: "result_view",
        faixa_destino: parsed.faixaDestino,
        mql: parsed.mql,
      })
    } catch {
      router.replace("/")
      return
    }
    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!loaded || !resultado) return null

  const primeiroNome = resultado.nome.trim().split(" ")[0] || resultado.nome

  const whatsappMessage = encodeURIComponent(
    `Olá! Sou ${resultado.nome} e acabei de fazer a calculadora de pontos da Viagente. Minha estimativa foi de ${formatCurrency(
      resultado.valorTotalReais
    )}. Quero saber mais.`
  )
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`
    : undefined
  const whatsappDisplayNumber = WHATSAPP_NUMBER
    ? WHATSAPP_NUMBER.replace(/^55/, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    : "[XXXXX]"

  return (
    <main
      className="relative min-h-screen flex flex-col items-center px-6 py-20 overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="aurora-blob aurora-blob-gold" aria-hidden="true" />
      <div className="dot-grid" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center">
        <Image src="/logo-viagente.svg" alt="Viagente" width={130} height={26} className="h-6 w-auto mb-10" priority />

        <span className="text-xs uppercase font-medium mb-4" style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}>
          Seus pontos, hoje
        </span>

        <h1 className="font-light leading-snug mb-8" style={{ fontSize: "clamp(24px, 4vw, 34px)", letterSpacing: "0.6px" }}>
          {primeiroNome}, veja quanto os seus pontos já valem.
        </h1>

        {/* Bloco 1 — Valor em reais */}
        <div className="card-featured card w-full mb-6">
          <p className="text-xs uppercase font-medium mb-4" style={{ letterSpacing: "2px", color: "var(--text-muted)" }}>
            Valor total dos seus pontos hoje
          </p>
          <p className="text-gold-gradient font-bold leading-none mb-2" style={{ fontSize: "clamp(40px, 9vw, 72px)" }}>
            {formatCurrency(resultado.valorTotalReais)}
          </p>
          <div className="divisor-dourado mx-auto" />
          <p className="text-sm font-light leading-relaxed mt-4" style={{ color: "var(--text-70)" }}>
            Esse é o valor estimado somando todos os programas que você informou, na cotação que usamos com nossos
            clientes.
          </p>
        </div>

        {/* Bloco 2 — Destino desbloqueado */}
        <div className="card w-full mb-6 text-left">
          <p className="text-xs uppercase font-medium mb-3" style={{ letterSpacing: "2px", color: "var(--text-muted)" }}>
            Com o que você já tem, dá pra ir
          </p>
          <p className="text-base font-light leading-relaxed" style={{ color: "var(--text)" }}>
            {destinoTextoPorFaixa[resultado.faixaDestino]}
          </p>
        </div>

        {/* Bloco 3 — Upgrade de cabine */}
        <div className="card w-full mb-8 text-left">
          <p className="text-xs uppercase font-medium mb-3" style={{ letterSpacing: "2px", color: "var(--text-muted)" }}>
            E o upgrade pra executiva?
          </p>
          <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
            {resultado.upgradeExecutivaAplicavel
              ? "Com o saldo que você tem, existe uma chance real de upgrade pra executiva na sua próxima viagem internacional. A gente te mostra como no WhatsApp."
              : "Ainda não, mas com uma estratégia de acúmulo certa, isso muda mais rápido do que parece. A gente te explica como no WhatsApp."}
          </p>
        </div>

        {/* Bloco 4 — Aviso de contato */}
        <div className="card-featured card w-full mb-10 text-left">
          <h2 className="text-base font-normal mb-2" style={{ color: "var(--text)" }}>
            Fica de olho no seu WhatsApp.
          </h2>
          <p className="text-sm font-light leading-relaxed mb-3" style={{ color: "var(--text-70)" }}>
            Um estrategista da Viagente vai te chamar em breve, pelo nosso WhatsApp oficial, o{" "}
            <strong style={{ color: "var(--text)" }}>{whatsappDisplayNumber}</strong>, pra te mostrar exatamente como
            usar esses pontos e o que mais dá pra fazer com eles que essa prévia não mostrou. Salva o contato e
            responde assim que a mensagem chegar, é rapidinho.
          </p>
          <p
            className="text-gold-gradient font-semibold text-center py-2"
            style={{ fontSize: "clamp(18px, 3vw, 22px)", letterSpacing: "0.02em" }}
          >
            {whatsappDisplayNumber}
          </p>
        </div>

        <h2 className="text-lg font-normal mb-2">Quer saber exatamente pra onde dá pra ir e como fazer isso render mais?</h2>
        <p className="text-sm font-light mb-8" style={{ color: "var(--text-70)" }}>
          Agende uma devolutiva rápida com um estrategista. Sem compromisso.
        </p>

        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-primary mb-6">
            {resultado.ctaLabel}
          </a>
        )}

        {YCBM_DOMAIN && (
          <div className="w-full" style={{ minHeight: 500 }}>
            <iframe
              src={`https://${YCBM_DOMAIN}`}
              title="Agendar devolutiva"
              className="w-full"
              style={{ minHeight: 500, border: "none" }}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </main>
  )
}
