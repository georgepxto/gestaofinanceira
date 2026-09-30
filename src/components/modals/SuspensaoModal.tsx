import { useState } from "react";
import { format, addMonths } from "date-fns";
import { FormSheet, Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";

interface SuspensaoModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (mesesArray: string[]) => Promise<void>;
  mesRef: Date;
  nomeGasto: string;
}

const OPCOES = [
  { valor: "1", rotulo: "Só este mês" },
  { valor: "3", rotulo: "3 meses" },
  { valor: "12", rotulo: "1 ano" },
  { valor: "custom", rotulo: "Escolher mês de volta" },
] as const;

/** Pausar um gasto fixo por alguns meses. Mesma conta de meses de antes. */
export function SuspensaoModal({ show, onClose, onConfirm, mesRef, nomeGasto }: SuspensaoModalProps) {
  const [tipo, setTipo] = useState<"1" | "3" | "12" | "custom">("1");
  const [dataReativacao, setDataReativacao] = useState("");
  const [salvando, setSaving] = useState(false);

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
        const targetMeses = ano * 12 + (mes - 1);
        const refMeses = mesRef.getFullYear() * 12 + mesRef.getMonth();
        numMeses = targetMeses - refMeses;
        if (numMeses <= 0) numMeses = 1;
      }
      for (let i = 0; i < numMeses; i++) {
        mesesParaAdicionar.push(format(addMonths(mesRef, i), "yyyy-MM"));
      }
      await onConfirm(mesesParaAdicionar);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      aberto={show}
      titulo="Pausar gasto fixo"
      aviso={`${nomeGasto} deixa de contar nos meses escolhidos e volta sozinho depois.`}
      onFechar={onClose}
      onEnviar={handleConfirm}
      rotuloEnviar="Pausar"
      enviando={salvando}
      podeEnviar={!(tipo === "custom" && !dataReativacao)}
    >
      <Campo rotulo="Por quanto tempo">
        <Chips>
          {OPCOES.map((o) => (
            <Chip key={o.valor} ativo={tipo === o.valor} onClick={() => setTipo(o.valor)}>
              {o.rotulo}
            </Chip>
          ))}
        </Chips>
      </Campo>
      {tipo === "custom" && (
        <Campo rotulo="Volta a contar em" htmlFor="suspensao-volta">
          <input
            id="suspensao-volta"
            type="month"
            min={format(addMonths(mesRef, 1), "yyyy-MM")}
            value={dataReativacao}
            onChange={(e) => setDataReativacao(e.target.value)}
            className={`${campoClasse} valor`}
          />
        </Campo>
      )}
    </FormSheet>
  );
}
