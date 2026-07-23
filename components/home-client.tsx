"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { pushToDataLayer } from "@/lib/tracking"
import { testimonials } from "@/lib/testimonials-data"

const CalculadoraQuiz = dynamic(() => import("@/components/calculadora-quiz"), {
  ssr: false,
  loading: () => null,
})

function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${visible ? "visible" : ""} ${className}`}
      style={{ ["--delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function HomeClient() {
  const [quizOpen, setQuizOpen] = useState(false)

  useEffect(() => {
    pushToDataLayer("calculadora_c_lp_view", { action_name: "lp_view" })
  }, [])

  const openQuiz = (position: "hero" | "meio" | "final") => {
    pushToDataLayer("calculadora_c_cta_click", { action_name: "cta_click", cta_position: position })
    setQuizOpen(true)
  }

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden px-6 pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="dot-grid" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-gold" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-purple" style={{ bottom: "-100px", right: "-100px" }} aria-hidden="true" />

        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
          <Image src="/logo-viagente.svg" alt="Viagente" width={140} height={28} className="h-6 w-auto mb-10" priority />

          <Reveal>
            <h1
              className="font-light leading-tight"
              style={{ fontSize: "clamp(32px, 5.5vw, 56px)", letterSpacing: "0.9px", color: "var(--text)" }}
            >
              Seus pontos valem <span className="text-gold-gradient font-normal">mais</span> do que você imagina. Você
              só não sabe quanto.
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <div className="divisor-dourado mx-auto" />
          </Reveal>

          <Reveal delay={180}>
            <p className="text-base md:text-lg font-light leading-relaxed max-w-xl" style={{ color: "var(--text-70)" }}>
              Some os pontos que você tem em cada programa e descubra, na hora: quanto eles valem em reais, se dá pra
              viajar de graça e se dá pra fazer upgrade para executiva. Leva 2 minutos.
            </p>
          </Reveal>

          <Reveal delay={280} className="mt-10">
            <button onClick={() => openQuiz("hero")} className="btn-primary">
              Calcular meus pontos agora
            </button>
          </Reveal>
        </div>
      </section>

      {/* ---------- COMO FUNCIONA ---------- */}
      <section className="relative px-6 py-24 glow-secao">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <span
              className="text-xs uppercase font-medium"
              style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}
            >
              Como funciona
            </span>
            <div className="divisor-dourado mx-auto mt-4" />
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                title: "Você informa seus pontos",
                desc: "Você informa quantos pontos tem em cada programa. Não precisa ter certeza exata, uma estimativa já funciona.",
              },
              {
                n: "02",
                title: "Calculamos o valor real",
                desc: "Nosso sistema calcula o valor real desses pontos hoje, com base nas mesmas referências que usamos pra cotar viagens de verdade.",
              },
              {
                n: "03",
                title: "Você vê na hora",
                desc: "Você vê quanto isso vale em reais e aonde já dá pra chegar. Se fizer sentido aprofundar, um estrategista te mostra o resto numa devolutiva rápida.",
              },
            ].map((item, i) => (
              <Reveal key={item.n} delay={i * 120}>
                <div className="card h-full">
                  <span className="text-gold-gradient text-3xl font-semibold">{item.n}</span>
                  <h3 className="mt-4 mb-2 text-lg font-normal" style={{ color: "var(--text)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PATRIMÔNIO PARADO ---------- */}
      <section className="relative px-6 py-24 glow-secao">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span
              className="text-xs uppercase font-medium"
              style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}
            >
              Viagente
            </span>
          </Reveal>

          <Reveal delay={60}>
            <p className="mt-4 text-sm font-light uppercase" style={{ letterSpacing: "2px", color: "var(--text-muted)" }}>
              Você já acumula. A pergunta é outra
            </p>
          </Reveal>

          <Reveal delay={120}>
            <h2
              className="font-light leading-snug mt-4"
              style={{ fontSize: "clamp(26px, 4.5vw, 40px)", letterSpacing: "0.9px", color: "var(--text)" }}
            >
              Pontos parados não valorizam.
              <br />
              Pontos usados na hora certa <span className="text-gold-gradient font-normal">viram viagem</span>.
            </h2>
          </Reveal>

          <Reveal delay={160} className="mt-8">
            <button onClick={() => openQuiz("meio")} className="btn-primary">
              Calcular meus pontos agora
            </button>
          </Reveal>

          <Reveal delay={220}>
            <div className="divisor-dourado mx-auto mt-8" />
          </Reveal>

          <Reveal delay={280}>
            <div className="card max-w-md mx-auto text-left">
              <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
                Usamos a mesma referência de valor que aplicamos nas cotações reais dos nossos clientes, não uma média
                genérica de internet.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- PROVA AGREGADA ---------- */}
      <section className="relative px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p
              className="font-bold"
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "clamp(40px, 9vw, 72px)",
                color: "var(--text)",
              }}
            >
              <span className="text-gold-gradient">R$ 76 mil+</span>
            </p>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-sm md:text-base font-light" style={{ color: "var(--text-70)" }}>
              em economia registrada no portal dos nossos clientes, em 61 emissões.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- SEGURANÇA DE DADOS ---------- */}
      <section className="relative px-6 py-24 glow-secao">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <h2 className="font-light mb-4" style={{ fontSize: "clamp(24px, 3.5vw, 32px)", letterSpacing: "0.6px" }}>
              Suas senhas nunca passam por aqui.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
              Nunca pedimos senha de banco ou de cartão. Emissões com milhas só acontecem com você na tela,
              compartilhando o próprio computador, e todo resgate exige o reconhecimento facial do titular na
              companhia aérea.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- DEPOIMENTOS ---------- */}
      <section className="relative px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-xs uppercase font-medium" style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}>
                Avaliações reais · Google
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1"
                style={{
                  borderRadius: "100px",
                  background: "rgba(229,149,1,0.08)",
                  border: "1px solid rgba(229,149,1,0.2)",
                  color: "var(--text)",
                }}
              >
                <span style={{ color: "var(--gold-mid)" }}>★</span> 5,0
              </span>
            </div>
            <h2 className="font-light" style={{ fontSize: "clamp(26px, 4vw, 36px)", letterSpacing: "0.9px" }}>
              O que nossos clientes <span className="text-gold-gradient font-normal">falam.</span>
            </h2>
            <div className="divisor-dourado mx-auto mt-4" />
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => {
              const soft = t.borderVariant === "gold-soft"
              return (
                <Reveal key={t.nome} delay={i * 100}>
                  <div
                    className="card h-full"
                    style={{
                      padding: "16px",
                      borderTopWidth: "2px",
                      borderTopColor: soft ? "rgba(212,165,55,0.5)" : "var(--gold-mid)",
                      borderColor: soft ? "rgba(212,165,55,0.2)" : undefined,
                    }}
                  >
                    <div
                      className="relative w-full mb-3 overflow-hidden"
                      style={{ aspectRatio: "1 / 1", borderRadius: "8px" }}
                    >
                      <Image src={t.foto} alt={t.nome} fill sizes="(max-width: 640px) 100vw, 260px" className="object-cover" />
                    </div>
                    <div className="mb-2" style={{ color: "var(--gold-solid)", fontSize: "14px", letterSpacing: "1px" }} aria-hidden="true">
                      ★★★★★
                    </div>
                    <p className="text-xs font-light leading-relaxed mb-3" style={{ color: "var(--text-70)" }}>
                      &ldquo;{t.texto}&rdquo;
                    </p>
                    <div
                      className="flex items-center gap-2.5 pt-2.5"
                      style={{ borderTop: `1px solid ${soft ? "rgba(212,165,55,0.15)" : "var(--border)"}` }}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{
                          background: soft ? "rgba(212,165,55,0.1)" : "rgba(42,42,42,1)",
                          border: `1px solid ${soft ? "rgba(212,165,55,0.2)" : "var(--border)"}`,
                          color: "var(--gold-solid)",
                        }}
                      >
                        {t.nome.charAt(0)}
                      </span>
                      <div className="text-xs font-light">
                        <p style={{ color: "var(--text)", fontWeight: 600 }}>{t.nome}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "9px" }}>{t.fonte}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="relative px-6 py-24 text-center overflow-hidden">
        <div className="aurora-blob aurora-blob-gold-secondary" style={{ top: "-60px", left: "50%", transform: "translateX(-50%)" }} aria-hidden="true" />
        <div className="relative z-10 max-w-xl mx-auto">
          <Reveal>
            <h2 className="font-light mb-4" style={{ fontSize: "clamp(26px, 4vw, 36px)", letterSpacing: "0.9px" }}>
              Descubra o que os seus <span className="text-gold-gradient font-normal">pontos valem</span> agora
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-sm font-light mb-8" style={{ color: "var(--text-70)" }}>
              Leva 2 minutos. Sem compromisso.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <button onClick={() => openQuiz("final")} className="btn-primary">
              Calcular meus pontos agora
            </button>
          </Reveal>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="px-6 py-10 text-center" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs font-light" style={{ color: "var(--text-muted)" }}>
          Viagente. Agência e gestão de viagens.
        </p>
        <p className="text-xs font-light mt-1" style={{ color: "var(--text-muted)" }}>
          viagente.com.br
        </p>
      </footer>

      <CalculadoraQuiz open={quizOpen} onClose={() => setQuizOpen(false)} />
    </main>
  )
}
