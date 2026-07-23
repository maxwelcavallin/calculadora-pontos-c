"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  captureTrackingParams,
  pushToDataLayer,
  getOrCreateLeadEventId,
  sanitizeErrorMessage,
  getTimeOnFormBucket,
  type TrackingParams,
} from "@/lib/tracking"
import {
  calcularResultado,
  frequenciaBucketMap,
  gastoCartaoBucketMap,
  maturidadeBucketMap,
  totalPontos,
  totalPontosBucket,
  algumProgramaPreenchido,
  programaLabels,
  type CalculadoraFormData,
  type Programa,
} from "@/lib/calculadora"

interface ValidationError {
  field_name: string
  error_type: string
  error_message: string
}

interface CalculadoraQuizProps {
  open: boolean
  onClose: () => void
}

const TOTAL_STEPS = 5

const loadingMessages = [
  "Somando seus pontos...",
  "Cruzando com as referências reais de cada programa...",
  "Calculando quanto isso vale hoje...",
  "Preparando sua prévia...",
]

const programas: Programa[] = ["livelo", "latamPass", "smiles", "esfera", "tudoAzul"]

const frequenciaOptions = [
  { value: "1-2", label: "1 a 2 vezes" },
  { value: "3-5", label: "3 a 5 vezes" },
  { value: "6+", label: "6 vezes ou mais" },
  { value: "raramente", label: "Raramente" },
]

const gastoCartaoOptions = [
  { value: "ate-5k", label: "Até R$ 5 mil" },
  { value: "5-15k", label: "R$ 5 a 15 mil" },
  { value: "15-30k", label: "R$ 15 a 30 mil" },
  { value: "acima-30k", label: "Acima de R$ 30 mil" },
]

const maturidadeOptions = [
  { value: "nunca-estruturei", label: "Ninguém, nunca estruturei" },
  { value: "eu-mesmo", label: "Eu mesmo, quando dá tempo" },
  { value: "curso-pouco", label: "Fiz curso, aplico pouco" },
  { value: "quero-delegar", label: "Quero delegar de vez" },
]

const stepSlugMap: Record<number, string> = {
  1: "pontos_por_programa",
  2: "frequencia_viagens",
  3: "gasto_mensal_cartao",
  4: "maturidade_milhas",
  5: "dados_contato",
}

function getStepMeta(stepIndex: number) {
  const slug = stepSlugMap[stepIndex] ?? `step_${stepIndex}`
  return { step_index: stepIndex, step_name: slug, step_slug: slug }
}

function formatWhatsappDisplay(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const emptyPontos = { livelo: 0, latamPass: 0, smiles: 0, esfera: 0, tudoAzul: 0 }

function emptyFormData(): CalculadoraFormData {
  return {
    pontos: { ...emptyPontos },
    frequencia: "" as CalculadoraFormData["frequencia"],
    gastoCartao: "" as CalculadoraFormData["gastoCartao"],
    maturidade: "" as CalculadoraFormData["maturidade"],
    nome: "",
    whatsapp: "",
    email: "",
  }
}

export default function CalculadoraQuiz({ open, onClose }: CalculadoraQuizProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [formData, setFormData] = useState<CalculadoraFormData>(emptyFormData())
  const [pontosDisplay, setPontosDisplay] = useState<Record<Programa, string>>({
    livelo: "",
    latamPass: "",
    smiles: "",
    esfera: "",
    tudoAzul: "",
  })
  const [whatsappDisplay, setWhatsappDisplay] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)

  const trackingParamsRef = useRef<TrackingParams | null>(null)
  const startedRef = useRef(false)
  const leadCreatedRef = useRef(false)
  const formOpenTimeRef = useRef<number>(0)
  const lastStepRef = useRef(1)

  // iOS Safari: overflow:hidden no body não trava o scroll de verdade — a página
  // desliza a cada abertura/fechamento do teclado. Fixar o body e compensar o scrollY.
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }
    body.style.position = "fixed"
    body.style.top = `${-scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setStep(1)
      setErrors({})
      setSubmitting(false)
      setShowLoading(false)
      setWhatsappDisplay("")
      setPontosDisplay({ livelo: "", latamPass: "", smiles: "", esfera: "", tudoAzul: "" })
      setFormData(emptyFormData())
      return
    }

    startedRef.current = false
    leadCreatedRef.current = false
    formOpenTimeRef.current = Date.now()
    lastStepRef.current = 1

    trackingParamsRef.current = captureTrackingParams()
    const tracking = trackingParamsRef.current

    startedRef.current = true
    pushToDataLayer("calculadora_c_start", {
      ...getStepMeta(1),
      action_name: "start",
      utm_source: tracking.utm_source,
      utm_medium: tracking.utm_medium,
      utm_campaign: tracking.utm_campaign,
      utm_term: tracking.utm_term,
      utm_content: tracking.utm_content,
      fbclid: tracking.fbclid,
      gclid: tracking.gclid,
      fbc: tracking.fbc,
      fbp: tracking.fbp,
    })
    pushToDataLayer("calculadora_c_step_view", {
      ...getStepMeta(1),
      action_name: "step_view",
      completion_percentage: Math.round((1 / TOTAL_STEPS) * 100),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleBeforeUnload = () => {
      if (!startedRef.current || leadCreatedRef.current) return
      const lastStep = getStepMeta(lastStepRef.current)
      pushToDataLayer("calculadora_c_form_abandon", {
        ...lastStep,
        action_name: "form_abandon",
        completion_percentage: Math.round((lastStepRef.current / TOTAL_STEPS) * 100),
        time_on_form_bucket: getTimeOnFormBucket(Date.now() - formOpenTimeRef.current),
      })
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleWindowError = (event: ErrorEvent) => {
      pushToDataLayer("calculadora_c_js_error", {
        ...getStepMeta(lastStepRef.current),
        action_name: "javascript_error",
        error_type: "javascript_error",
        error_message: sanitizeErrorMessage(event.message),
        file_name: event.filename ?? "",
        line_number: event.lineno ?? "",
      })
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      pushToDataLayer("calculadora_c_js_error", {
        ...getStepMeta(lastStepRef.current),
        action_name: "unhandled_promise_rejection",
        error_type: "unhandled_promise_rejection",
        error_message: sanitizeErrorMessage(String(event.reason)),
      })
    }
    window.addEventListener("error", handleWindowError)
    window.addEventListener("unhandledrejection", handleRejection)
    return () => {
      window.removeEventListener("error", handleWindowError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [open])

  function validateStep(stepIndex: number): ValidationError[] {
    const errs: ValidationError[] = []
    if (stepIndex === 1 && !algumProgramaPreenchido(formData.pontos)) {
      errs.push({
        field_name: "pontos",
        error_type: "required_field",
        error_message: "Informe o saldo em pelo menos um programa.",
      })
    }
    if (stepIndex === 2 && !formData.frequencia) {
      errs.push({ field_name: "frequencia", error_type: "required_field", error_message: "Selecione uma opção." })
    }
    if (stepIndex === 3 && !formData.gastoCartao) {
      errs.push({ field_name: "gasto_cartao", error_type: "required_field", error_message: "Selecione uma opção." })
    }
    if (stepIndex === 4 && !formData.maturidade) {
      errs.push({ field_name: "maturidade", error_type: "required_field", error_message: "Selecione uma opção." })
    }
    if (stepIndex === 5) {
      if (!formData.nome.trim()) {
        errs.push({ field_name: "nome", error_type: "required_field", error_message: "Informe seu nome." })
      }
      const digits = whatsappDisplay.replace(/\D/g, "")
      if (digits.length < 10) {
        errs.push({ field_name: "whatsapp", error_type: "invalid_phone", error_message: "Informe o WhatsApp com DDD." })
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errs.push({ field_name: "email", error_type: "invalid_email", error_message: "Informe um e-mail válido." })
      }
    }
    return errs
  }

  function trackValidationErrors(stepMeta: ReturnType<typeof getStepMeta>, validationErrors: ValidationError[]) {
    validationErrors.forEach((error) => {
      pushToDataLayer("calculadora_c_validation_error", {
        ...stepMeta,
        action_name: "validation_error",
        field_name: error.field_name,
        error_type: error.error_type,
        error_message: sanitizeErrorMessage(error.error_message),
        validation_errors_count: validationErrors.length,
      })
    })
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setShowLoading(true)
    setLoadingMsgIndex(0)

    const resultado = calcularResultado(formData)
    sessionStorage.setItem("calculadora_c_resultado", JSON.stringify(resultado))

    let msgIndex = 0
    const msgInterval = setInterval(() => {
      msgIndex++
      if (msgIndex < loadingMessages.length) setLoadingMsgIndex(msgIndex)
    }, 700)

    const finalStep = getStepMeta(TOTAL_STEPS)
    const leadEventId = getOrCreateLeadEventId()
    const tracking = trackingParamsRef.current ?? captureTrackingParams()

    pushToDataLayer("calculadora_c_submit_attempt", {
      ...finalStep,
      event_id: leadEventId,
      action_name: "submit_attempt",
    })

    try {
      const leadRes = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          whatsapp: `+55 ${whatsappDisplay}`,
          pontos: formData.pontos,
          frequencia: formData.frequencia,
          gastoCartao: formData.gastoCartao,
          maturidade: formData.maturidade,
          valorTotalReais: resultado.valorTotalReais,
          totalPontos: resultado.totalPontos,
          faixaDestino: resultado.faixaDestino,
          mql: resultado.mql,
          upgradeExecutivaAplicavel: resultado.upgradeExecutivaAplicavel,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_term: tracking.utm_term,
          utm_content: tracking.utm_content,
          fbclid: tracking.fbclid,
          gclid: tracking.gclid,
          referrer: tracking.referrer,
          fbp: tracking.fbp,
          fbc: tracking.fbc,
          client_user_agent: tracking.client_user_agent,
        }),
      })

      if (leadRes.ok) {
        leadCreatedRef.current = true

        pushToDataLayer("generate_lead", {
          ...finalStep,
          event_id: leadEventId,
          action_name: "lead_created",
          source_event: "calculadora_c_generate_lead",
          lead_source: "site",
          faixa_destino: resultado.faixaDestino,
          mql: resultado.mql,
          crm_status: "success",
          currency: "BRL",
          value: resultado.valorTotalReais,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_term: tracking.utm_term,
          utm_content: tracking.utm_content,
          fbclid: tracking.fbclid,
          gclid: tracking.gclid,
          fbc: tracking.fbc,
          fbp: tracking.fbp,
        })
      } else {
        pushToDataLayer("calculadora_c_integration_error", {
          ...finalStep,
          event_id: leadEventId,
          action_name: "integration_error",
          error_type: "crm_create_failed",
          error_message: sanitizeErrorMessage(`Lead API respondeu HTTP ${leadRes.status}`),
          crm_status: "failed",
        })
      }
    } catch (error) {
      pushToDataLayer("calculadora_c_integration_error", {
        ...finalStep,
        event_id: leadEventId,
        action_name: "integration_error",
        error_type: "network_error",
        error_message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
        crm_status: "failed",
      })
    }

    setTimeout(() => {
      clearInterval(msgInterval)
      onClose()
      router.push("/resultado")
    }, 2600)
  }, [formData, whatsappDisplay, onClose, router])

  const goNext = useCallback(() => {
    setStep((currentStep) => {
      const currentStepMeta = getStepMeta(currentStep)
      pushToDataLayer("calculadora_c_next_click", { ...currentStepMeta, action_name: "next_click" })

      const validationErrors = validateStep(currentStep)

      if (currentStep === TOTAL_STEPS) {
        if (validationErrors.length > 0) {
          setErrors(Object.fromEntries(validationErrors.map((e) => [e.field_name, e.error_message])))
          pushToDataLayer("calculadora_c_submit_blocked", {
            ...currentStepMeta,
            action_name: "submit_blocked",
            blocked_reason: "validation_failed",
            validation_errors_count: validationErrors.length,
          })
          trackValidationErrors(currentStepMeta, validationErrors)
          return currentStep
        }
        setErrors({})
        pushToDataLayer("calculadora_c_next_success", { ...currentStepMeta, action_name: "next_success" })
        setTimeout(() => handleSubmit(), 0)
        return currentStep
      }

      if (validationErrors.length > 0) {
        setErrors(Object.fromEntries(validationErrors.map((e) => [e.field_name, e.error_message])))
        pushToDataLayer("calculadora_c_next_blocked", {
          ...currentStepMeta,
          action_name: "next_blocked",
          blocked_reason: "validation_failed",
          validation_errors_count: validationErrors.length,
        })
        trackValidationErrors(currentStepMeta, validationErrors)
        return currentStep
      }

      setErrors({})

      const answerBucketMap: Record<number, string> = {
        1: totalPontosBucket(totalPontos(formData.pontos)),
        2: frequenciaBucketMap[formData.frequencia] ?? "unknown",
        3: gastoCartaoBucketMap[formData.gastoCartao] ?? "unknown",
        4: maturidadeBucketMap[formData.maturidade] ?? "unknown",
      }

      pushToDataLayer("calculadora_c_step_answered", {
        ...currentStepMeta,
        action_name: "step_answered",
        answer_bucket: answerBucketMap[currentStep] ?? "unknown",
        completion_percentage: Math.round((currentStep / TOTAL_STEPS) * 100),
      })

      const nextStep = currentStep < TOTAL_STEPS ? currentStep + 1 : currentStep
      const nextStepMeta = getStepMeta(nextStep)
      lastStepRef.current = nextStep

      pushToDataLayer("calculadora_c_next_success", {
        ...currentStepMeta,
        next_step_index: nextStepMeta.step_index,
        next_step_name: nextStepMeta.step_name,
        action_name: "next_success",
      })
      pushToDataLayer("calculadora_c_step_view", {
        ...nextStepMeta,
        action_name: "step_view",
        completion_percentage: Math.round((nextStep / TOTAL_STEPS) * 100),
      })

      setAnimating(true)
      setTimeout(() => setAnimating(false), 220)
      return nextStep
    })
  }, [formData, whatsappDisplay, handleSubmit])

  const goBack = useCallback(() => {
    if (step > 1) {
      setAnimating(true)
      setTimeout(() => {
        setStep((s) => s - 1)
        setAnimating(false)
      }, 220)
    }
  }, [step])

  const setField = <K extends keyof CalculadoraFormData>(field: K, value: CalculadoraFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors({})
  }

  const handlePontosInput = (programa: Programa, raw: string) => {
    const digits = raw.replace(/\D/g, "")
    setPontosDisplay((prev) => ({ ...prev, [programa]: digits }))
    setFormData((prev) => ({ ...prev, pontos: { ...prev.pontos, [programa]: digits ? parseInt(digits, 10) : 0 } }))
    setErrors({})
  }

  const handleWhatsappInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11)
    setWhatsappDisplay(formatWhatsappDisplay(digits))
    setFormData((prev) => ({ ...prev, whatsapp: digits }))
    setErrors({})
  }

  if (!open) return null

  if (showLoading) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="flex flex-col items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 9999, height: "100svh", backgroundColor: "#111111" }}
      >
        <div className="flex flex-col items-center gap-8 px-6 text-center max-w-sm">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border" style={{ borderColor: "rgba(255,255,255,.12)" }} />
            <div
              className="absolute inset-0 rounded-full border animate-spin"
              style={{ borderColor: "var(--gold-mid)", borderTopColor: "transparent" }}
            />
          </div>
          <p key={loadingMsgIndex} className="text-sm font-light" style={{ color: "var(--text-70)" }}>
            {loadingMessages[loadingMsgIndex]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="flex flex-col"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100svh",
        backgroundColor: "#111111",
        zIndex: 9999,
        overscrollBehavior: "contain",
      }}
    >
      <div
        className="flex items-center justify-between px-6 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-sm tracking-widest uppercase" style={{ color: "var(--text-70)" }}>
          Viagente
        </span>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="w-8 h-8 flex items-center justify-center"
          style={{ color: "var(--text-70)" }}
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-6 pt-6 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-light tracking-wide" style={{ color: "var(--text-muted)" }}>
            {step} de {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, background: "var(--gold-mid)" }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div className="flex flex-col min-h-full px-6 pt-10">
          <div
            className="transition-opacity"
            style={{ opacity: animating ? 0 : 1, transitionDuration: animating ? "200ms" : "300ms" }}
          >
            {step === 1 && (
              <StepWrapper title="Quantos pontos você tem hoje em cada programa? Pode estimar.">
                <div className="flex flex-col gap-5">
                  {programas.map((programa) => (
                    <div key={programa}>
                      <label
                        className="block text-[11px] mb-2 uppercase tracking-widest font-light"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {programaLabels[programa]}
                      </label>
                      <input
                        inputMode="numeric"
                        type="text"
                        value={pontosDisplay[programa]}
                        onChange={(e) => handlePontosInput(programa, e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent px-0 py-3 font-light focus:outline-none"
                        style={{ fontSize: "16px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                      />
                    </div>
                  ))}
                  <p className="text-[11px] font-light" style={{ color: "var(--text-muted)" }}>
                    Não precisa ter certeza exata, uma estimativa já funciona. Preencha pelo menos um programa.
                  </p>
                  {errors.pontos && <ErrorMsg>{errors.pontos}</ErrorMsg>}
                </div>
              </StepWrapper>
            )}

            {step === 2 && (
              <StepWrapper title="Com que frequência você viaja por ano?">
                <OptionGrid options={frequenciaOptions} value={formData.frequencia} onChange={(v) => setField("frequencia", v as CalculadoraFormData["frequencia"])} />
                {errors.frequencia && <ErrorMsg>{errors.frequencia}</ErrorMsg>}
              </StepWrapper>
            )}

            {step === 3 && (
              <StepWrapper title="Gasto mensal no cartão de crédito, somando PF e PJ">
                <OptionGrid options={gastoCartaoOptions} value={formData.gastoCartao} onChange={(v) => setField("gastoCartao", v as CalculadoraFormData["gastoCartao"])} />
                {errors.gasto_cartao && <ErrorMsg>{errors.gasto_cartao}</ErrorMsg>}
              </StepWrapper>
            )}

            {step === 4 && (
              <StepWrapper title="Hoje, quem cuida das suas milhas e emissões?">
                <OptionGrid options={maturidadeOptions} value={formData.maturidade} onChange={(v) => setField("maturidade", v as CalculadoraFormData["maturidade"])} />
                {errors.maturidade && <ErrorMsg>{errors.maturidade}</ErrorMsg>}
              </StepWrapper>
            )}

            {step === 5 && (
              <StepWrapper title="Seus dados para receber o resultado">
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="block text-[11px] mb-2 uppercase tracking-widest font-light" style={{ color: "var(--text-muted)" }}>
                      Nome
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setField("nome", e.target.value)}
                      placeholder="Seu nome"
                      className="w-full bg-transparent px-0 py-3 font-light focus:outline-none"
                      style={{ fontSize: "16px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    />
                    {errors.nome && <ErrorMsg>{errors.nome}</ErrorMsg>}
                  </div>

                  <div>
                    <label className="block text-[11px] mb-2 uppercase tracking-widest font-light" style={{ color: "var(--text-muted)" }}>
                      WhatsApp com DDD
                    </label>
                    <input
                      inputMode="numeric"
                      type="tel"
                      value={whatsappDisplay}
                      onChange={(e) => handleWhatsappInput(e.target.value)}
                      placeholder="(11) 90000-0000"
                      className="w-full bg-transparent px-0 py-3 font-light focus:outline-none"
                      style={{ fontSize: "16px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    />
                    {errors.whatsapp && <ErrorMsg>{errors.whatsapp}</ErrorMsg>}
                  </div>

                  <div>
                    <label className="block text-[11px] mb-2 uppercase tracking-widest font-light" style={{ color: "var(--text-muted)" }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="voce@email.com"
                      className="w-full bg-transparent px-0 py-3 font-light focus:outline-none"
                      style={{ fontSize: "16px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    />
                    {errors.email && <ErrorMsg>{errors.email}</ErrorMsg>}
                  </div>

                  <p className="text-[11px] font-light" style={{ color: "var(--text-muted)" }}>
                    Ao enviar, calculamos na hora. Se fizer sentido, um estrategista te chama no WhatsApp pra
                    aprofundar. Sem spam, sem robô.
                  </p>
                </div>
              </StepWrapper>
            )}
          </div>

          <div
            className="flex items-center gap-3 pt-4 mt-auto flex-shrink-0"
            style={{
              borderTop: "1px solid var(--border)",
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-sm font-light px-3 py-2.5"
                style={{ color: "var(--text-70)" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar
              </button>
            )}
            <button onClick={goNext} disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Processando..." : step === TOTAL_STEPS ? "Ver o que meus pontos valem" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8 max-w-md mx-auto w-full">
      <h2 className="text-xl md:text-2xl font-light leading-snug" style={{ color: "var(--text)", letterSpacing: "0.01em" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function OptionGrid({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-light transition-all duration-200"
            style={{
              border: `1px solid ${selected ? "var(--gold-mid)" : "var(--border)"}`,
              background: selected ? "rgba(212,165,55,0.08)" : "transparent",
              color: selected ? "var(--text)" : "var(--text-70)",
            }}
          >
            <span className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  border: `1px solid ${selected ? "var(--gold-mid)" : "rgba(255,255,255,.3)"}`,
                  background: selected ? "var(--gold-mid)" : "transparent",
                }}
              />
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-2 font-light" style={{ color: "#e0685f" }}>
      {children}
    </p>
  )
}
