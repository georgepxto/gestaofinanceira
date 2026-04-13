import { useEffect } from "react";
import {
  useTutorialHelpContext,
  type TutorialHelpButtonConfig,
} from "../components/layout/TutorialHelpContext";

export const usePageTutorialHelpButton = (config: TutorialHelpButtonConfig) => {
  const { setHelpButton } = useTutorialHelpContext();
  const { onClick, title, ariaLabel, dataTour } = config;

  useEffect(() => {
    setHelpButton({ onClick, title, ariaLabel, dataTour });
    return () => setHelpButton(null);
  }, [ariaLabel, dataTour, onClick, setHelpButton, title]);
};
