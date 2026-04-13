import { createContext, useContext } from "react";

export interface TutorialHelpButtonConfig {
  onClick: () => void;
  title: string;
  ariaLabel: string;
  dataTour?: string;
}

interface TutorialHelpContextValue {
  helpButton: TutorialHelpButtonConfig | null;
  setHelpButton: (config: TutorialHelpButtonConfig | null) => void;
}

export const TutorialHelpContext = createContext<TutorialHelpContextValue | null>(null);

export const useTutorialHelpContext = () => {
  const context = useContext(TutorialHelpContext);
  if (!context) {
    throw new Error("useTutorialHelpContext must be used within TutorialHelpContext provider");
  }
  return context;
};
