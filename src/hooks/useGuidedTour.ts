import { useCallback, useEffect, useMemo, useState } from "react";

export interface GuidedTourStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

interface UseGuidedTourOptions<T extends GuidedTourStep> {
  steps: T[];
  storageKey: string;
}

interface GuidedTourPersistenceState {
  seen: boolean;
  lastStepIndex: number | null;
}

const DEFAULT_TOUR_STATE: GuidedTourPersistenceState = {
  seen: false,
  lastStepIndex: null,
};

const readGuidedTourState = (storageKey: string): GuidedTourPersistenceState => {
  const raw = localStorage.getItem(storageKey);

  if (!raw) {
    return DEFAULT_TOUR_STATE;
  }

  // Backward compatibility with legacy "true" marker.
  if (raw === "true") {
    return {
      seen: true,
      lastStepIndex: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GuidedTourPersistenceState>;
    return {
      seen: Boolean(parsed.seen),
      lastStepIndex:
        typeof parsed.lastStepIndex === "number" && Number.isFinite(parsed.lastStepIndex)
          ? parsed.lastStepIndex
          : null,
    };
  } catch {
    return DEFAULT_TOUR_STATE;
  }
};

const writeGuidedTourState = (
  storageKey: string,
  state: GuidedTourPersistenceState
) => {
  localStorage.setItem(storageKey, JSON.stringify(state));
};

const clampStepIndex = (stepIndex: number, totalSteps: number) => {
  if (totalSteps <= 0) return 0;
  return Math.min(Math.max(stepIndex, 0), totalSteps - 1);
};

export function useGuidedTour<T extends GuidedTourStep>({
  steps,
  storageKey,
}: UseGuidedTourOptions<T>) {
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialSteps, setTutorialSteps] = useState<T[]>([]);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const state = readGuidedTourState(storageKey);

    if (!state.seen) {
      const availableSteps = steps.filter((step) =>
        Boolean(document.querySelector(step.target))
      );
      setTutorialSteps(availableSteps);
      setShowTutorial(availableSteps.length > 0);
      setTutorialStepIndex(0);
      writeGuidedTourState(storageKey, {
        seen: true,
        lastStepIndex: availableSteps.length > 0 ? 0 : null,
      });
    }
  }, [steps, storageKey]);

  const openTutorial = useCallback(() => {
    const availableSteps = steps.filter((step) =>
      Boolean(document.querySelector(step.target))
    );
    const state = readGuidedTourState(storageKey);
    const resumeStepIndex = clampStepIndex(state.lastStepIndex ?? 0, availableSteps.length);

    setTutorialSteps(availableSteps);
    setTutorialStepIndex(resumeStepIndex);
    setShowTutorial(availableSteps.length > 0);
    writeGuidedTourState(storageKey, {
      seen: true,
      lastStepIndex: availableSteps.length > 0 ? resumeStepIndex : null,
    });
  }, [steps, storageKey]);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const nextTutorialStep = useCallback(() => {
    setTutorialStepIndex((prev) => {
      if (prev >= tutorialSteps.length - 1) {
        setShowTutorial(false);
        writeGuidedTourState(storageKey, {
          seen: true,
          lastStepIndex: null,
        });
        return prev;
      }

      const next = prev + 1;
      writeGuidedTourState(storageKey, {
        seen: true,
        lastStepIndex: next,
      });
      return next;
    });
  }, [storageKey, tutorialSteps.length]);

  const previousTutorialStep = useCallback(() => {
    setTutorialStepIndex((prev) => {
      const previous = Math.max(prev - 1, 0);
      writeGuidedTourState(storageKey, {
        seen: true,
        lastStepIndex: previous,
      });
      return previous;
    });
  }, [storageKey]);

  useEffect(() => {
    if (!showTutorial || tutorialSteps.length === 0) return;

    const currentStep = tutorialSteps[tutorialStepIndex];
    const targetElement = document.querySelector(currentStep.target);

    if (!targetElement) {
      setHighlightRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(currentStep.target);
      if (!el) return;
      setHighlightRect(el.getBoundingClientRect());
    };

    const targetRect = (targetElement as HTMLElement).getBoundingClientRect();
    const isFullyVisible =
      targetRect.top >= 96 &&
      targetRect.bottom <= window.innerHeight - 96 &&
      targetRect.left >= 16 &&
      targetRect.right <= window.innerWidth - 16;

    if (!isFullyVisible && tutorialStepIndex > 0) {
      (targetElement as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [showTutorial, tutorialStepIndex, tutorialSteps]);

  const currentTutorialStep = tutorialSteps[tutorialStepIndex];

  const { tooltipLeft, tooltipTop, showTooltipBelow } = useMemo(() => {
    const isMobile = viewportSize.width < 640;
    const tooltipWidth = isMobile ? Math.min(viewportSize.width - 24, 360) : 340;
    const tooltipHeight = isMobile ? 360 : 300;

    const left = highlightRect
      ? isMobile
        ? 12
        : Math.min(
            Math.max(
              16,
              highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2
            ),
            Math.max(16, viewportSize.width - tooltipWidth - 16)
          )
      : 16;

    if (!highlightRect) {
      return { tooltipLeft: left, tooltipTop: 16, showTooltipBelow: false };
    }

    if (isMobile) {
      const minTop = 8;
      const maxTop = Math.max(minTop, viewportSize.height - tooltipHeight - 8);
      const spacing = 10;
      const preferredPlacement = currentTutorialStep?.placement;
      const topBelow = highlightRect.bottom + spacing;
      const topAbove = highlightRect.top - tooltipHeight - spacing;
      const canPlaceBelow = topBelow <= maxTop;
      const canPlaceAbove = topAbove >= minTop;

      if (preferredPlacement === "below" && canPlaceBelow) {
        return { tooltipLeft: left, tooltipTop: topBelow, showTooltipBelow: true };
      }

      if (preferredPlacement === "above" && canPlaceAbove) {
        return { tooltipLeft: left, tooltipTop: topAbove, showTooltipBelow: false };
      }

      if (canPlaceBelow) {
        return { tooltipLeft: left, tooltipTop: topBelow, showTooltipBelow: true };
      }

      if (canPlaceAbove) {
        return { tooltipLeft: left, tooltipTop: topAbove, showTooltipBelow: false };
      }

      const clampedBelow = Math.min(Math.max(topBelow, minTop), maxTop);
      const clampedAbove = Math.min(Math.max(topAbove, minTop), maxTop);
      const overlapBelow = Math.max(
        0,
        Math.min(clampedBelow + tooltipHeight, highlightRect.bottom) -
          Math.max(clampedBelow, highlightRect.top)
      );
      const overlapAbove = Math.max(
        0,
        Math.min(clampedAbove + tooltipHeight, highlightRect.bottom) -
          Math.max(clampedAbove, highlightRect.top)
      );

      if (overlapBelow <= overlapAbove) {
        return {
          tooltipLeft: left,
          tooltipTop: clampedBelow,
          showTooltipBelow: true,
        };
      }

      return {
        tooltipLeft: left,
        tooltipTop: clampedAbove,
        showTooltipBelow: false,
      };
    }

    const minTop = 16;
    const maxTop = Math.max(16, viewportSize.height - tooltipHeight - 16);
    const spacing = 12;
    const preferredPlacement = currentTutorialStep?.placement;
    const topBelow = highlightRect.bottom + spacing;
    const topAbove = highlightRect.top - tooltipHeight - spacing;
    const canPlaceBelow = topBelow <= maxTop;
    const canPlaceAbove = topAbove >= minTop;

    if (preferredPlacement === "below" && canPlaceBelow) {
      return { tooltipLeft: left, tooltipTop: topBelow, showTooltipBelow: true };
    }

    if (preferredPlacement === "above" && canPlaceAbove) {
      return { tooltipLeft: left, tooltipTop: topAbove, showTooltipBelow: false };
    }

    if (canPlaceBelow) {
      return { tooltipLeft: left, tooltipTop: topBelow, showTooltipBelow: true };
    }

    if (canPlaceAbove) {
      return { tooltipLeft: left, tooltipTop: topAbove, showTooltipBelow: false };
    }

    const clampedBelow = Math.min(Math.max(topBelow, minTop), maxTop);
    const clampedAbove = Math.min(Math.max(topAbove, minTop), maxTop);
    const overlapBelow = Math.max(
      0,
      Math.min(clampedBelow + tooltipHeight, highlightRect.bottom) -
        Math.max(clampedBelow, highlightRect.top)
    );
    const overlapAbove = Math.max(
      0,
      Math.min(clampedAbove + tooltipHeight, highlightRect.bottom) -
        Math.max(clampedAbove, highlightRect.top)
    );

    if (overlapBelow <= overlapAbove) {
      return {
        tooltipLeft: left,
        tooltipTop: clampedBelow,
        showTooltipBelow: true,
      };
    }

    return {
      tooltipLeft: left,
      tooltipTop: clampedAbove,
      showTooltipBelow: false,
    };
  }, [currentTutorialStep?.placement, highlightRect, viewportSize.height, viewportSize.width]);

  return {
    viewportSize,
    showTutorial,
    tutorialStepIndex,
    tutorialSteps,
    currentTutorialStep,
    highlightRect,
    tooltipLeft,
    tooltipTop,
    showTooltipBelow,
    openTutorial,
    closeTutorial,
    nextTutorialStep,
    previousTutorialStep,
  };
}
