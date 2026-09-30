import { X } from "lucide-react";
import { Button } from "./ui/Button";
import { Pill } from "./ui/Pill";

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

/**
 * O balão do tutorial ("?"). --surface-2 com borda --line, cabeçalho neutro e
 * o indicador de passos em --accent. O alvo fica recortado no fundo escurecido,
 * com um contorno de 2px no tom do texto — sem brilho.
 */
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

  const recorte = "fixed bg-scrim";

  return (
    <div className="fixed inset-0 z-modal-top pointer-events-none">
      {highlightRect && (
        <>
          <div className={recorte} style={{ top: 0, left: 0, width: "100%", height: Math.max(0, highlightRect.top - 8) }} />
          <div
            className={recorte}
            style={{
              top: Math.max(0, highlightRect.top - 8),
              left: 0,
              width: Math.max(0, highlightRect.left - 8),
              height: highlightRect.height + 16,
            }}
          />
          <div
            className={recorte}
            style={{
              top: Math.max(0, highlightRect.top - 8),
              left: highlightRect.right + 8,
              width: Math.max(0, viewportSize.width - highlightRect.right - 8),
              height: highlightRect.height + 16,
            }}
          />
          <div
            className={recorte}
            style={{
              top: highlightRect.bottom + 8,
              left: 0,
              width: "100%",
              height: Math.max(0, viewportSize.height - highlightRect.bottom - 8),
            }}
          />
          <div
            className="fixed rounded border-2 border-fg"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
            }}
          />
          {/* Seta do balão, na cor do balão */}
          <div
            className="absolute w-0 h-0"
            style={{
              left: highlightRect.left + highlightRect.width / 2 - 8,
              top: showTooltipBelow ? highlightRect.bottom + 8 : highlightRect.top - 16,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: showTooltipBelow ? "0" : "8px solid var(--surface-2)",
              borderBottom: showTooltipBelow ? "8px solid var(--surface-2)" : "0",
            }}
          />
        </>
      )}

      <div
        role="dialog"
        aria-labelledby="tour-titulo"
        className="absolute pointer-events-auto bg-surface-2 text-fg w-[calc(100vw-24px)] max-w-[360px] rounded border border-line max-h-[calc(100vh-24px)] overflow-y-auto"
        style={{ left: tooltipLeft, top: tooltipTop }}
      >
        <div className="px-4 pt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-fg-3">
              {tutorialTitle} · passo <span className="valor">{stepIndex + 1}</span> de <span className="valor">{totalSteps}</span>
            </p>
            <h3 id="tour-titulo" className="text-base font-medium text-fg mt-1">
              {currentStep.titulo}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 -mr-2 -mt-1 shrink-0 rounded flex items-center justify-center text-fg-3 hover:text-fg transition-colors"
            aria-label="Fechar tutorial"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-4 py-3">
          <Pill>{currentStep.alvo}</Pill>
          <p className="text-sm text-fg-2 leading-relaxed mt-3">{currentStep.descricao}</p>

          <div className="flex gap-1 mt-4" aria-hidden="true">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 transition-colors ${i <= stepIndex ? "bg-accent" : "bg-surface-3"}`} />
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-2">
          <Button variante="fantasma" tamanho="sm" onClick={onPrevious} disabled={stepIndex === 0}>
            Voltar
          </Button>
          <Button variante="secundario" tamanho="sm" onClick={onNext} className="bg-surface-3 hover:bg-surface-1">
            {stepIndex === totalSteps - 1 ? "Concluir" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
};
