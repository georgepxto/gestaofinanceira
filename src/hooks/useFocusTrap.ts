import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const toque = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;

const SEM_TECLADO = new Set(["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image"]);

function abreTeclado(alvo: HTMLElement) {
  if (alvo.isContentEditable || alvo instanceof HTMLTextAreaElement) return true;
  return alvo instanceof HTMLInputElement && !SEM_TECLADO.has(alvo.type);
}

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
    //
    // No toque, focar um campo de texto abre o teclado sem a pessoa pedir —
    // então ali o foco fica no próprio painel e o teclado só sobe no toque.
    const preferido = el.querySelector<HTMLElement>("[data-autofocus]");
    const alvo = preferido ?? getFocusables()[0];
    if (alvo && !(toque() && abreTeclado(alvo))) alvo.focus();
    else {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }

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
