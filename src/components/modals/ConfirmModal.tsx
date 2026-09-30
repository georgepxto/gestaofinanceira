import { useState } from "react";
import type { ModalConfirm } from "../../types/extended";
import { toast } from "../ui/Toaster";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface ConfirmModalProps {
  modal: ModalConfirm;
  saving: boolean;
  onClose: () => void;
}

/**
 * A confirmação global do app (estado em AppContext), desenhada pelo
 * <ConfirmDialog>. Vermelho é perigo; as outras cores antigas viram a ação
 * principal comum — âmbar e esmeralda não existem mais na interface.
 */
export function ConfirmModal({ modal, saving, onClose }: ConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const label = modal.confirmLabel || "Excluir";

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await modal.onConfirm();
      if (modal.successMessage) {
        toast.success(modal.successMessage);
      } else {
        toast.success(label === "Excluir" ? "Excluído." : "Feito.");
      }
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <ConfirmDialog
      aberto={modal.show}
      titulo={modal.titulo}
      mensagem={modal.mensagem}
      rotuloConfirmar={label}
      tom={(modal.confirmColor || "red") === "red" ? "perigo" : "principal"}
      carregando={saving || isProcessing}
      onConfirmar={handleConfirm}
      onCancelar={onClose}
    />
  );
}
