import { HelpCircle } from "lucide-react";
import { useTutorialHelpContext } from "./TutorialHelpContext";

/** O "?" do tutorial da tela aberta. Some quando a tela não tem tutorial. */
export function BotaoAjuda() {
  const { helpButton } = useTutorialHelpContext();
  if (!helpButton) return null;
  return (
    <button
      onClick={helpButton.onClick}
      data-tour={helpButton.dataTour}
      title={helpButton.title}
      aria-label={helpButton.ariaLabel}
      className="w-11 h-11 md:w-9 md:h-9 flex items-center justify-center rounded text-fg-2 hover:text-fg hover:bg-surface-2 transition-colors"
    >
      <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
    </button>
  );
}
