import { useState } from "react";
import { format, addMonths } from "date-fns";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks";

interface SuspensaoModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (mesesArray: string[]) => Promise<void>;
  mesRef: Date;
  nomeGasto: string;
}

export function SuspensaoModal({ show, onClose, onConfirm, mesRef, nomeGasto }: SuspensaoModalProps) {
  const [tipo, setTipo] = useState<"1" | "3" | "12" | "custom">("1");
  const [dataReativacao, setDataReativacao] = useState("");
  const [salvando, setSaving] = useState(false);
  const dialogRef = useFocusTrap(onClose, show);

  if (!show) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const mesesParaAdicionar: string[] = [];
      let numMeses = 1;

      if (tipo === "1") numMeses = 1;
      else if (tipo === "3") numMeses = 3;
      else if (tipo === "12") numMeses = 12;
      else if (tipo === "custom" && dataReativacao) {
        const [ano, mes] = dataReativacao.split("-").map(Number);
        const refAno = mesRef.getFullYear();
        const refMes = mesRef.getMonth();
        const targetMeses = ano * 12 + (mes - 1);
        const refMeses = refAno * 12 + refMes;
        numMeses = targetMeses - refMeses;
        if (numMeses <= 0) numMeses = 1;
      }

      for (let i = 0; i < numMeses; i++) {
        const d = addMonths(mesRef, i);
        mesesParaAdicionar.push(format(d, "yyyy-MM"));
      }

      await onConfirm(mesesParaAdicionar);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const minDateLimit = format(addMonths(mesRef, 1), "yyyy-MM");

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspensao-modal-title"
        className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 id="suspensao-modal-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Suspender Gasto Fixo
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Você está suspendendo o gasto <strong className="text-zinc-800 dark:text-white">{nomeGasto}</strong>.
            Escolha por quanto tempo deseja pausar:
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.06] dark:border-white/[0.09]">
              <input type="radio" checked={tipo === "1"} onChange={() => setTipo("1")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600" />
              <span className="text-zinc-700 dark:text-zinc-300">Apenas neste mês (1 mês)</span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.06] dark:border-white/[0.09]">
              <input type="radio" checked={tipo === "3"} onChange={() => setTipo("3")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600" />
              <span className="text-zinc-700 dark:text-zinc-300">Por 3 meses</span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.06] dark:border-white/[0.09]">
              <input type="radio" checked={tipo === "12"} onChange={() => setTipo("12")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600" />
              <span className="text-zinc-700 dark:text-zinc-300">Por 1 ano (12 meses)</span>
            </label>

            <label className="flex flex-col gap-2 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.06] dark:border-white/[0.09]">
              <div className="flex items-center gap-3">
                <input type="radio" checked={tipo === "custom"} onChange={() => setTipo("custom")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600" />
                <span className="text-zinc-700 dark:text-zinc-300">Escolher mês de volta</span>
              </div>
              {tipo === "custom" && (
                <div className="ml-7 mt-2">
                  <input
                    type="month"
                    min={minDateLimit}
                    value={dataReativacao}
                    onChange={(e) => setDataReativacao(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-white/[0.09] text-zinc-800 dark:text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                  />
                  <p className="text-xs text-zinc-500 mt-1">O gasto voltará a ser cobrado no mês escolhido.</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
          <button
            onClick={onClose}
            disabled={salvando}
            className="flex-1 py-2 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={salvando || (tipo === "custom" && !dataReativacao)}
            className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {salvando ? "Suspendendo..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
