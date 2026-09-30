import React from "react";
import { formatMonthYear } from "../../utils/calculations";
import { FormSheet, Campo, campoClasse } from "../ui/FormSheet";

interface ObservacaoModalProps {
  show: boolean;
  pessoa: string | null;
  mesVisualizacao: Date;
  obsTexto: string;
  saving: boolean;
  onClose: () => void;
  onTextChange: (text: string) => void;
  onSave: (pessoa: string) => void;
}

/** Observação livre sobre o mês de uma pessoa. */
export const ObservacaoModal: React.FC<ObservacaoModalProps> = ({
  show,
  pessoa,
  mesVisualizacao,
  obsTexto,
  saving,
  onClose,
  onTextChange,
  onSave,
}) => (
  <FormSheet
    aberto={show && !!pessoa}
    titulo="Observação"
    aviso={`${pessoa ?? ""} · ${formatMonthYear(mesVisualizacao)}`}
    onFechar={onClose}
    onEnviar={() => pessoa && onSave(pessoa)}
    rotuloEnviar="Salvar"
    enviando={saving}
  >
    <Campo rotulo="Observação" htmlFor="obs-texto">
      <textarea
        id="obs-texto"
        data-autofocus
        value={obsTexto}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Ex: pagou R$ 1.000 em 15/12, falta R$ 500"
        rows={5}
        className={`${campoClasse} h-auto py-2.5 resize-none leading-relaxed`}
      />
    </Campo>
  </FormSheet>
);
