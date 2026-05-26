"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useFinance } from "@/contexts/finance-context"
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"

interface TourStep {
  target: string        // seletor CSS do elemento a destacar
  title: string
  description: string
  position: "top" | "bottom" | "left" | "right"
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='summary']",
    title: "Resumo Financeiro",
    description: "Aqui você acompanha suas receitas, despesas e saldo do mês. Navegue entre os meses pelas setas.",
    position: "bottom",
  },
  {
    target: "[data-tour='upcoming']",
    title: "Próximos Vencimentos",
    description: "Veja contas fixas e lançamentos futuros que estão chegando. Nunca mais esqueça um pagamento!",
    position: "bottom",
  },
  {
    target: "[data-tour='charts']",
    title: "Gráficos",
    description: "Visualize seus gastos por categoria e a evolução mensal das suas finanças.",
    position: "top",
  },
  {
    target: "[data-tour='recent']",
    title: "Transações Recentes",
    description: "Suas últimas movimentações ficam aqui. Clique em 'Ver todas' para o histórico completo.",
    position: "top",
  },
  {
    target: "[data-tour='ai']",
    title: "Assistente IA ✨",
    description: "Clique aqui para conversar com a IA sobre suas finanças. Ela analisa seus dados e dá dicas personalizadas!",
    position: "left",
  },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export function OnboardingTour() {
  const { user } = useFinance()
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const supabase = createClient()

  const checkOnboarding = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()

    if (!data?.onboarding_completed) {
      // Pequeno delay para a página renderizar
      setTimeout(() => setIsVisible(true), 800)
    }
  }, [user, supabase])

  useEffect(() => {
    checkOnboarding()
  }, [checkOnboarding])

  const updatePosition = useCallback(() => {
    if (!isVisible) return
    const step = TOUR_STEPS[currentStep]
    const el = document.querySelector(step.target)
    if (!el) return

    const rect = el.getBoundingClientRect()
    const padding = 8

    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })

    // Calcula posição do tooltip
    const tooltipWidth = 320
    const tooltipHeight = 160
    let top = 0
    let left = 0

    if (step.position === "bottom") {
      top = rect.bottom + padding + 12
      left = rect.left + rect.width / 2 - tooltipWidth / 2
    } else if (step.position === "top") {
      top = rect.top - tooltipHeight - padding - 12
      left = rect.left + rect.width / 2 - tooltipWidth / 2
    } else if (step.position === "left") {
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left - tooltipWidth - padding - 12
    } else {
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.right + padding + 12
    }

    // Garante que não sai da tela
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))

    setTooltipPos({ top, left })

    // Scroll para o elemento ficar visível
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [isVisible, currentStep])

  useEffect(() => {
    updatePosition()
    window.addEventListener("resize", updatePosition)
    return () => window.removeEventListener("resize", updatePosition)
  }, [updatePosition])

  async function completeOnboarding() {
    if (!user) return
    await supabase.from("profiles").upsert({
      id: user.id,
      onboarding_completed: true,
    })
    setIsVisible(false)
  }

  function next() {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeOnboarding()
    }
  }

  function prev() {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  if (!isVisible) return null

  const step = TOUR_STEPS[currentStep]

  return (
    <>
      {/* Overlay com buraco */}
      <div className="fixed inset-0 z-[60] pointer-events-none">
        {targetRect && (
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.6)"
              mask="url(#tour-mask)"
            />
            {/* Borda animada ao redor do elemento */}
            <rect
              x={targetRect.left}
              y={targetRect.top}
              width={targetRect.width}
              height={targetRect.height}
              rx="12"
              fill="none"
              stroke="rgb(var(--primary))"
              strokeWidth="2"
              className="animate-pulse"
            />
          </svg>
        )}
      </div>

      {/* Botão pular */}
      <button
        onClick={completeOnboarding}
        className="fixed top-4 right-4 z-[70] flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors shadow-lg"
      >
        <X className="h-3.5 w-3.5" />
        Pular tour
      </button>

      {/* Tooltip */}
      <div
        className="fixed z-[70] w-80 bg-card border border-border rounded-2xl shadow-2xl p-5"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold">{step.title}</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? "w-4 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prev}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Concluir" : "Próximo"}
              {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
