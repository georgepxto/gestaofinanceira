import { useEffect, useRef, useState } from "react";
import { AbasDaSecao, BarraApp, TelaPessoas, TopoApp } from "./app/telas";

/* ═══════════════════════════════════════════════════════════════════════
   Uma mão real segurando o celular, com a aba Dividir do app na tela.

   Dois arquivos derivados da foto do Unsplash (celular.webp):
   - celular-mao.webp: a foto com fundo transparente. Sai o branco ligado às
     bordas e os bolsões de branco presos entre a mão e o aparelho; a borda
     da pele é encolhida 5 px (a luz da foto deixava ali uma franja clara).
   - celular-tela.png: a forma exata da tela, tirada da própria foto (o cinza
     ligado ao centro, parando no preto da borda e na pele). A tela do app só
     aparece dentro dela: cantos, recorte da câmera e dedos ficam como na foto.
   ═══════════════════════════════════════════════════════════════════════ */

const PHOTO = 1100;
/* Retângulo que contém a tela, em px da foto. */
const BOX = { x: 358, y: 96, w: 402, h: 854 };
/* O recorte da câmera ocupa os primeiros 36 px da tela. */
const NOTCH_H = 36;
/** Largura em que a tela do app é desenhada antes de ser escalada. */
const DESIGN_W = 360;
const DESIGN_H = Math.round((BOX.h / BOX.w) * DESIGN_W);
const STATUS_H = Math.round((NOTCH_H / BOX.w) * DESIGN_W);

export function PhoneInHand({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale((e.contentRect.width * (BOX.w / PHOTO)) / DESIGN_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pct = (v: number) => `${(v / PHOTO) * 100}%`;

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label="Mão segurando um celular com o Hedge aberto em A receber, Pessoas: quanto cada pessoa deve no total."
      className={`lp-phone relative aspect-square w-full ${className}`}
    >
      <img
        src="/landing/celular-mao.webp"
        width={PHOTO}
        height={PHOTO}
        alt=""
        loading="lazy"
        decoding="async"
        className="lp-hand absolute inset-0 h-full w-full"
      />

      {/* A tela do app, recortada pela forma real da tela da foto */}
      <div aria-hidden="true" className="lp-phone-screen lp-force-dark absolute inset-0">
        <div
          className="app-escuro absolute overflow-hidden bg-page"
          style={{ left: pct(BOX.x), top: pct(BOX.y), width: pct(BOX.w), height: pct(BOX.h) }}
        >
          <div
            className="flex flex-col"
            style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: "top left", backfaceVisibility: "hidden" }}
          >
            {/* Barra de status em volta do recorte da câmera, que é o da foto */}
            <div className="flex shrink-0 items-center justify-between px-6 text-[12px] font-medium" style={{ height: STATUS_H + 6 }}>
              <span className="lp-num">9:41</span>
              <span className="lp-num text-[11px]">5G</span>
            </div>
            <TopoApp />
            <div className="shrink-0 px-4 pt-1 pb-3">
              <AbasDaSecao abas={["Pessoas", "Cobranças", "Mês a mês"]} ativa="Pessoas" />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-4">
              <TelaPessoas />
            </div>
            <BarraApp ativa="receber" />
          </div>
        </div>
      </div>
    </div>
  );
}
