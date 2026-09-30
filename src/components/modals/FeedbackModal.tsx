import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Info } from "lucide-react";
import type { ModalFeedback } from "../../types/extended";
import { useFocusTrap } from "../../hooks";
import { Button } from "../ui/Button";

interface FeedbackModalProps {
  modal: ModalFeedback;
  onClose: () => void;
}

/** Aviso que pede leitura (erro com instrução, conta excluída). Mesmo painel do ConfirmDialog. */
export const FeedbackModal: React.FC<FeedbackModalProps> = ({ modal, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const dialogRef = useFocusTrap(onClose, modal.show);

  useEffect(() => {
    if (modal.show) {
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 150);
      return () => clearTimeout(timer);
    }
  }, [modal.show]);

  if (!isRendered) return null;

  const Icone = modal.tipo === "sucesso" ? Check : Info;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end md:items-center justify-center p-4">
      <div
        className={`fixed inset-0 bg-scrim transition-opacity duration-150 ${isVisible ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
        /* ds-ok: fundo de dispensa. O foco fica preso no diálogo e o Esc fecha — o fundo não entra na ordem de foco de propósito */
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className={`relative w-full max-w-sm bg-surface-2 border border-line rounded p-5 mb-[env(safe-area-inset-bottom)] transition-[opacity,transform] duration-150 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="flex items-start gap-3">
          <Icone className="w-5 h-5 mt-0.5 shrink-0 text-fg-2" strokeWidth={1.5} aria-hidden="true" />
          <div className="min-w-0">
            <h3 id="feedback-modal-title" className="text-base font-medium text-fg">
              {modal.titulo}
            </h3>
            <p className="text-sm text-fg-2 whitespace-pre-line mt-1.5 leading-relaxed">{modal.mensagem}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onClose} data-autofocus>
            Entendido
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
