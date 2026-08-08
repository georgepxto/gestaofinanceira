import { X } from "lucide-react";

interface GuidedTourOverlayStep {
  alvo: string;
  titulo: string;
  descricao: string;
}

interface GuidedTourOverlayProps {
  show: boolean;
  tutorialTitle: string;
  currentStep: GuidedTourOverlayStep | null | undefined;
  stepIndex: number;
  totalSteps: number;
  highlightRect: DOMRect | null;
  viewportSize: {
    width: number;
    height: number;
  };
  tooltipLeft: number;
  tooltipTop: number;
  showTooltipBelow: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const GuidedTourOverlay = ({
  show,
  tutorialTitle,
  currentStep,
  stepIndex,
  totalSteps,
  highlightRect,
  viewportSize,
  tooltipLeft,
  tooltipTop,
  showTooltipBelow,
  onClose,
  onPrevious,
  onNext,
}: GuidedTourOverlayProps) => {
  if (!show || !currentStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none" style={{ position: "fixed" }}>
      {highlightRect && (
        <>
          <div
            className="fixed bg-black/75"
            style={{
              top: 0,
              left: 0,
              width: "100%",
              height: Math.max(0, highlightRect.top - 8),
            }}
          />
          <div
            className="fixed bg-black/75"
            style={{
              top: Math.max(0, highlightRect.top - 8),
              left: 0,
              width: Math.max(0, highlightRect.left - 8),
              height: highlightRect.height + 16,
            }}
          />
          <div
            className="fixed bg-black/75"
            style={{
              top: Math.max(0, highlightRect.top - 8),
              left: highlightRect.right + 8,
              width: Math.max(0, viewportSize.width - highlightRect.right - 8),
              height: highlightRect.height + 16,
            }}
          />
          <div
            className="fixed bg-black/75"
            style={{
              top: highlightRect.bottom + 8,
              left: 0,
              width: "100%",
              height: Math.max(0, viewportSize.height - highlightRect.bottom - 8),
            }}
          />
          <div
            className="fixed rounded-2xl border-2 border-emerald-300 bg-transparent"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: "0 0 0 2px rgba(52,211,153,0.55), 0 0 24px rgba(16,185,129,0.20)",
            }}
          />
        </>
      )}

      {highlightRect && (
        <div
          className="absolute w-0 h-0"
          style={{
            left: highlightRect.left + highlightRect.width / 2 - 10,
            top: showTooltipBelow ? highlightRect.bottom + 6 : highlightRect.top - 16,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: showTooltipBelow ? "12px solid #059669" : "0px solid transparent",
            borderBottom: showTooltipBelow ? "0px solid transparent" : "12px solid #059669",
          }}
        />
      )}

      <div
        /* ds-ok: balão do tour é posicionado no alvo e flutua acima do recorte — geometria e sombra próprias */
        className="absolute pointer-events-auto bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 w-[calc(100vw-24px)] max-w-[360px] rounded-2xl border border-zinc-200 dark:border-white/[0.06] overflow-hidden shadow-2xl dark:shadow-black/60 max-h-[calc(100vh-24px)] overflow-y-auto"
        style={{ left: tooltipLeft, top: tooltipTop }}
      >
        <div className="px-4 py-3 border-b border-emerald-700/40 flex items-start justify-between gap-3 bg-emerald-600 dark:bg-emerald-700">
          <div>
            <p className="font-mono text-[11px] font-medium text-emerald-50">
              {tutorialTitle} • Passo {stepIndex + 1} de {totalSteps}
            </p>
            <h3 className="font-display text-base font-bold text-white mt-1">{currentStep.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-colors"
            aria-label="Fechar tutorial"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-medium uppercase tracking-[0.16em] mb-3 border border-emerald-200 dark:border-emerald-900">
            {currentStep.alvo}
          </div>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">{currentStep.descricao}</p>

          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-emerald-500" : "bg-zinc-200 dark:bg-white/[0.07]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 dark:border-white/[0.06] flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-950">
          <button
            onClick={onPrevious}
            disabled={stepIndex === 0}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Voltar
          </button>

          <button
            onClick={onNext}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            {stepIndex === totalSteps - 1 ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
};