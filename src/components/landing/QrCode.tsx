import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { MARK_D, MARK_H, MARK_RATIO, MARK_VIEWBOX } from "./HedgeMark";

/**
 * QR code em SVG, montado no navegador. Módulos escuros sobre papel claro:
 * é o contraste que qualquer câmera lê, mesmo com a página no tema escuro.
 * O monograma ocupa o miolo; a correção de erro alta (H, até 30%) cobre os
 * módulos que ele esconde (a placa usa ~6% da área).
 */
export function QrCode({ value, size = 120, label }: { value: string; size?: number; label: string }) {
  const { path, n } = useMemo(() => {
    const qr = qrcode(0, "H");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      }
    }
    return { path: d, n: count };
  }, [value]);

  const quiet = 2;
  // Placa do centro, em módulos inteiros para não cortar módulo pela metade.
  const plate = Math.round(n * 0.24) | 1;
  const p0 = (n - plate) / 2;
  const mh = plate * 0.7;
  const mw = mh * MARK_RATIO;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`}
      shapeRendering="crispEdges"
      className="block rounded-[3px]"
      style={{ backgroundColor: "#F4F3EE" }}
    >
      <path d={path} fill="#0B0B0C" />
      <rect x={p0} y={p0} width={plate} height={plate} fill="#F4F3EE" />
      <svg x={(n - mw) / 2} y={(n - mh) / 2} width={mw} height={mh} viewBox={MARK_VIEWBOX} shapeRendering="geometricPrecision">
        <path d={MARK_H + MARK_D} fill="#0B0B0C" />
      </svg>
    </svg>
  );
}
