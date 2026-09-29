import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * QR code em SVG, montado no navegador. Módulos escuros sobre papel claro:
 * é o contraste que qualquer câmera lê, mesmo com a página no tema escuro.
 */
export function QrCode({ value, size = 120, label }: { value: string; size?: number; label: string }) {
  const { path, n } = useMemo(() => {
    const qr = qrcode(0, "M");
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
    </svg>
  );
}
