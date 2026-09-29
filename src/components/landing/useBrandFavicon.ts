import { useEffect } from "react";

/* Ícone da aba com o monograma enquanto a landing ou o login estão abertos.
   O resto do app ainda usa o escudo (favicon-light/dark.png) até ser
   reestruturado. Os links do escudo saem do <head> e voltam na saída.
   Numa carga direta de "/" ou "/login", o script do index.html já fez a
   troca antes da primeira pintura e deixou os links em __hedgeAppIcons. */

declare global {
  interface Window {
    __hedgeAppIcons?: HTMLLinkElement[];
  }
}

const BRAND_ID = "brand-icon";

export function useBrandFavicon() {
  useEffect(() => {
    const head = document.head;
    if (!document.getElementById(BRAND_ID)) {
      const icons = [...head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')];
      icons.forEach((l) => l.remove());
      window.__hedgeAppIcons = icons;
      const brand = document.createElement("link");
      brand.id = BRAND_ID;
      brand.rel = "icon";
      brand.type = "image/svg+xml";
      brand.href = "/hedge-mark.svg";
      head.appendChild(brand);
    }
    return () => {
      document.getElementById(BRAND_ID)?.remove();
      (window.__hedgeAppIcons ?? []).forEach((l) => head.appendChild(l));
      window.__hedgeAppIcons = undefined;
    };
  }, []);
}
