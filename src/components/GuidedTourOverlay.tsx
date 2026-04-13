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
            className="fixed rounded-2xl border-2 border-blue-300 bg-transparent"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: "0 0 0 2px rgba(96,165,250,0.55), 0 0 24px rgba(59,130,246,0.18)",
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
            borderTop: showTooltipBelow ? "12px solid #2563EB" : "0px solid transparent",
            borderBottom: showTooltipBelow ? "0px solid transparent" : "12px solid #2563EB",
          }}
        />
      )}

      <div
        className="absolute pointer-events-auto bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 w-[calc(100vw-24px)] max-w-[360px] rounded-2xl border border-blue-200 dark:border-blue-900 overflow-hidden shadow-2xl max-h-[calc(100vh-24px)] overflow-y-auto"
        style={{ left: tooltipLeft, top: tooltipTop }}
      >
        <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-900 flex items-start justify-between gap-3 bg-blue-600 dark:bg-blue-700">
          <div>
            <p className="text-xs font-medium text-blue-50 dark:text-blue-100">
              {tutorialTitle} • Passo {stepIndex + 1} de {totalSteps}
            </p>
            <h3 className="text-base font-semibold text-white mt-1">{currentStep.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            aria-label="Fechar tutorial"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200 text-xs font-semibold mb-3 border border-blue-200 dark:border-blue-900">
            {currentStep.alvo}
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{currentStep.descricao}</p>

          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-950">
          <button
            onClick={onPrevious}
            disabled={stepIndex === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Voltar
          </button>

          <button
            onClick={onNext}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {stepIndex === totalSteps - 1 ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
};