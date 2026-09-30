import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks";
import { Button } from "./Button";

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  mensagem: React.ReactNode;
  rotuloConfirmar?: string;
  /** "perigo" para excluir e desfazer; "principal" para confirmar uma ação comum. */
  tom?: "perigo" | "principal";
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmação de ação. Destrutiva: botão em --danger e "Cancelar" como botão
 * fantasma. Painel em --surface-2 com borda --line, sem sombra, centrado.
 */
export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = "Excluir",
  tom = "perigo",
  carregando = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const ref = useFocusTrap(carregando ? undefined : onCancelar, aberto);
  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal-top flex items-end md:items-center justify-center p-4 bg-scrim animate-[fundo-entra_150ms_ease-out]">
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        aria-describedby="confirm-mensagem"
        className="w-full max-w-sm bg-surface-2 border border-line rounded p-5 mb-[env(safe-area-inset-bottom)]"
      >
        <h2 id="confirm-titulo" className="text-base font-medium text-fg">
          {titulo}
        </h2>
        <div id="confirm-mensagem" className="mt-2 text-sm text-fg-2 leading-relaxed">
          {mensagem}
        </div>
        <div className="mt-6 flex flex-col-reverse md:flex-row md:justify-end gap-2">
          <Button variante="fantasma" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </Button>
          <Button
            variante={tom}
            onClick={onConfirmar}
            carregando={carregando}
            data-autofocus={tom === "perigo" ? undefined : true}
          >
            {rotuloConfirmar}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
