import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  onEscape?: () => void,
  enabled = true
) {
  const ref = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const prev = document.activeElement as HTMLElement | null;

    const getFocusables = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));

    // `data-autofocus` ganha do primeiro focável. Sem isso o foco cai sempre no
    // botão de fechar do cabeçalho — e numa folha cujo assunto é um campo (o
    // valor do lançamento), o `autoFocus` do JSX era engolido por este efeito.
    const preferido = el.querySelector<HTMLElement>("[data-autofocus]");
    const initial = getFocusables();
    if (preferido) preferido.focus();
    else if (initial.length) initial[0].focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onEscapeRef.current?.(); return; }
      if (e.key !== "Tab") return;
      const all = getFocusables();
      if (!all.length) { e.preventDefault(); return; }
      const first = all[0], last = all[all.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      prev?.focus();
    };
  }, [enabled]);

  return ref;
}
