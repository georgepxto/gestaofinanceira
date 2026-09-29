/* ═══════════════════════════════════════════════════════════════════════
   Objetos da seção de Segurança: cadeado, arquivo exportado e etiqueta de
   preço riscada. Desenhados só com as cores do tema (sem brilho, sem
   degradê): o relevo vem de uma face mais clara em cima e de uma borda
   de 1px. O movimento de cada um (cadeado fecha, arquivo sobe, risco
   passa) toca uma vez quando o painel entra; depois cada um segue num
   movimento contínuo e lento (texto cifrado correndo, arquivo flutuando,
   etiqueta balançando), só enquanto está na tela. Ver .lp-obj no CSS.
   ═══════════════════════════════════════════════════════════════════════ */

const S = {
  face: "var(--lp-track)",
  body: "var(--lp-bg)",
  edge: "var(--lp-muted)",   // contorno legível sobre a superfície
  ink: "var(--lp-fg)",
  fg: "var(--lp-fg)",
};

/** Cadeado sobre linhas de texto cifrado. */
export function LockObject() {
  return (
    <svg viewBox="0 0 240 160" className="lp-obj lp-obj-lock h-full w-full" aria-hidden="true">
      {/* texto cifrado ao fundo */}
      {[0, 1, 2, 3, 4].map((r) => (
        <g key={r} opacity={0.5} className="lp-obj-cipher" style={{ animationDirection: r % 2 ? "reverse" : "normal", animationDuration: `${7 + r * 1.3}s` }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
            <rect key={c} x={20 + c * 26 + ((r * 7) % 11)} y={28 + r * 22} width={12 + ((r + c) % 3) * 4} height={3} rx={1.5} fill={S.edge} />
          ))}
        </g>
      ))}
      {/* arco do cadeado */}
      <path className="lp-obj-shackle" d="M100 78 V60 a20 20 0 0 1 40 0 V78" fill="none" stroke={S.ink} strokeWidth={7} strokeLinecap="round" />
      {/* corpo */}
      <rect x={84} y={74} width={72} height={58} rx={6} fill={S.body} stroke={S.edge} />
      <rect x={85} y={75} width={70} height={10} rx={5} fill={S.face} />
      {/* fechadura */}
      <circle cx={120} cy={100} r={6} fill={S.ink} />
      <rect x={118} y={103} width={4} height={13} rx={2} fill={S.ink} />
    </svg>
  );
}

/** Arquivo subindo de uma bandeja: exportar tudo. */
export function ExportObject() {
  return (
    <svg viewBox="0 0 240 160" className="lp-obj lp-obj-export h-full w-full" aria-hidden="true">
      <g className="lp-obj-float"><g className="lp-obj-file">
        <path d="M92 24 h40 l16 16 v70 a4 4 0 0 1 -4 4 h-52 a4 4 0 0 1 -4 -4 v-82 a4 4 0 0 1 4 -4 z" fill={S.body} stroke={S.edge} />
        <path d="M132 24 v12 a4 4 0 0 0 4 4 h12" fill={S.face} stroke={S.edge} />
        {[52, 62, 72, 82, 92].map((y, i) => (
          <rect key={y} x={100} y={y} width={i % 2 ? 26 : 38} height={3} rx={1.5} fill={S.ink} opacity={0.6} />
        ))}
      </g></g>
      {/* bandeja */}
      <path d="M62 108 v18 a6 6 0 0 0 6 6 h104 a6 6 0 0 0 6 -6 v-18" fill="none" stroke={S.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Etiqueta de preço com o valor riscado: nada é vendido. */
export function PriceTagObject() {
  return (
    <svg viewBox="0 0 240 160" className="lp-obj lp-obj-tag h-full w-full" aria-hidden="true">
      {/* barbante */}
      <path d="M96 88 C82 60 64 50 50 34" fill="none" stroke={S.ink} strokeWidth={2} strokeLinecap="round" />
      <g className="lp-obj-sway">
      <g transform="rotate(-10 128 84)">
        <path d="M84 60 l16 -18 h76 a6 6 0 0 1 6 6 v72 a6 6 0 0 1 -6 6 h-76 l-16 -18 z" fill={S.body} stroke={S.edge} />
        <path d="M100 43 h76 a5 5 0 0 1 5 5 v6 h-97 z" fill={S.face} />
        <circle cx={96} cy={84} r={5} fill="none" stroke={S.ink} strokeWidth={2} />
        <text x={146} y={93} textAnchor="middle" className="lp-num" fontSize={26} fill={S.fg}>R$</text>
        {/* o risco que cancela o preço */}
        <path className="lp-obj-strike" d="M112 112 L180 58" fill="none" stroke={S.fg} strokeWidth={3} strokeLinecap="round" pathLength={1} />
      </g>
      </g>
    </svg>
  );
}
