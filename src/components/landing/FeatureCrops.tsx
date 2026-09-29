import { CartoesScreen, ContasScreen, GastosScreen, GrupoScreen, MetasScreen, RelatorioScreen } from "./app/screens";
import { ScreenCrop } from "./app/ui";

/* Cada funcionalidade mostra a tela correspondente do app, recortada:
   a parte de cima inteira e a base dissolvendo. Dados fictícios. */

const H = 560;

export const CropPessoais = () => (
  <ScreenCrop height={H} label="Tela de gastos pessoais: total do mês, divisão por categoria e lançamentos por dia. Dados fictícios.">
    <GastosScreen />
  </ScreenCrop>
);

export const CropCompartilhados = () => (
  <ScreenCrop label="Tela do grupo Apê 302: quem pagou cada conta, quem deve a quem e o que já foi quitado. Dados fictícios.">
    <GrupoScreen wide />
  </ScreenCrop>
);

export const CropCartoes = () => (
  <ScreenCrop height={H} label="Tela do cartão: fatura aberta, limite usado, datas e parcelas desta fatura. Dados fictícios.">
    <CartoesScreen />
  </ScreenCrop>
);

export const CropMetas = () => (
  <ScreenCrop height={H} label="Tela de metas: teto por categoria; Alimentação passou de 80% e aparece em alerta. Dados fictícios.">
    <MetasScreen />
  </ScreenCrop>
);

export const CropContas = () => (
  <ScreenCrop height={H} label="Tela de contas: saldo somado, saldo por conta e movimentações recentes. Dados fictícios.">
    <ContasScreen />
  </ScreenCrop>
);

export const CropRelatorios = () => (
  <ScreenCrop height={H} label="Prévia do relatório mensal em PDF com gastos por categoria. Dados fictícios.">
    <RelatorioScreen />
  </ScreenCrop>
);
