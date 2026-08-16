import { useEffect, useRef } from "react";
import type { MeuGastoForm } from "../types";
import { formatCurrencyValue, parseCurrency } from "../utils/calculations";

/**
 * Mantém `minha_parte` dividida em partes iguais entre você e as pessoas
 * escolhidas, sem pisar em valor digitado à mão.
 *
 * Mora num hook porque o formulário de gasto tem duas apresentações — o diálogo
 * do desktop e a folha do mobile — e esta regra é do formulário, não de uma
 * delas. Duplicá-la seria a maneira mais fácil de as duas telas passarem a
 * gravar números diferentes.
 */
export function useMinhaParteAutomatica(
  formData: MeuGastoForm,
  onFormChange: (data: MeuGastoForm) => void
) {
  const ultimaAutomatica = useRef<string>("");

  useEffect(() => {
    if (formData.categoria !== "dividido") return;

    const pessoasSelecionadas = formData.dividido_com_pessoas || [];
    if (pessoasSelecionadas.length === 0) return;

    const valorTotal = parseCurrency(formData.valor);
    if (valorTotal <= 0) return;

    const minhaParteFormatada = formatCurrencyValue(
      valorTotal / (pessoasSelecionadas.length + 1)
    );

    if (
      formData.minha_parte.trim() === "" ||
      formData.minha_parte === ultimaAutomatica.current
    ) {
      ultimaAutomatica.current = minhaParteFormatada;
      onFormChange({ ...formData, minha_parte: minhaParteFormatada });
    }
    // `formData` inteiro e `onFormChange` ficam fora de propósito: o efeito chama
    // `onFormChange` com um `formData` novo, então listá-lo criaria loop. A escrita
    // já é protegida por `ultimaAutomatica`, que impede sobrescrever valor
    // digitado à mão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.categoria, formData.dividido_com_pessoas, formData.valor]);
}
