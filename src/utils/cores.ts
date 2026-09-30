/**
 * Cor do cartão: identidade do banco, escolhida pela pessoa e gravada no
 * registro. Aparece só como faixa de 3px na borda do cartão e como ponto de
 * 8px — nunca em fundo, texto, barra ou valor.
 *
 * A paleta é dessaturada para conviver com o laranja e os neutros. Os tons
 * antigos (saturados) continuam gravados nos cartões de quem já os escolheu:
 * `corDoCartao` os traduz para o equivalente novo na hora de mostrar, sem
 * tocar no banco.
 */

// ds-ok: identidade do cartão escolhida pela pessoa — é dado, não cor de interface.
export const CORES_CARTAO = ["#7C6FA8", "#5F7896", "#5E8C92", "#A0708A", "#A3765E", "#86708E", "#7A7A78"];

export const COR_CARTAO_PADRAO = CORES_CARTAO[0];

// ds-ok: os hex antigos, só como chave de tradução para a paleta nova.
const ANTIGA_PARA_NOVA: Record<string, string> = {
  "#5B21B6": CORES_CARTAO[0], // ds-ok: tom antigo gravado
  "#1E3A8A": CORES_CARTAO[1], // ds-ok: tom antigo gravado
  "#155E75": CORES_CARTAO[2], // ds-ok: tom antigo gravado
  "#9D174D": CORES_CARTAO[3], // ds-ok: tom antigo gravado
  "#7C2D12": CORES_CARTAO[4], // ds-ok: tom antigo gravado
  "#4A044E": CORES_CARTAO[5], // ds-ok: tom antigo gravado
  "#3F3F46": CORES_CARTAO[6], // ds-ok: tom antigo gravado
};

export function corDoCartao(cor: string | null | undefined): string {
  if (!cor) return COR_CARTAO_PADRAO;
  return ANTIGA_PARA_NOVA[cor.toUpperCase()] ?? cor;
}
