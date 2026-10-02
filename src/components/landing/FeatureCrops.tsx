import { ScreenCrop } from "./app/ui";
import { TelaApp, TelaCartao, TelaContas, TelaLancamentos, TelaMetas, TelaPessoas, TelaRelatorio } from "./app/telas";

/* Cada funcionalidade mostra a tela do app (os mesmos componentes do app),
   recortada: a parte de cima inteira e a base dissolvendo. Dados fictícios. */

const H = 560;

export const CropPessoais = () => (
  <ScreenCrop height={H} label="Tela de Lançamentos do Hedge: crédito, débito e fixos do mês e os lançamentos por dia. Dados fictícios.">
    <TelaApp className="p-4 sm:rounded">
      <TelaLancamentos />
    </TelaApp>
  </ScreenCrop>
);

export const CropCompartilhados = () => (
  <ScreenCrop height={H} label="Tela de Pessoas do Hedge: quanto cada pessoa te deve no total, somando o mês e as cobranças. Dados fictícios.">
    <TelaApp className="p-4 sm:p-5 sm:rounded">
      <TelaPessoas />
    </TelaApp>
  </ScreenCrop>
);

export const CropCartoes = () => (
  <ScreenCrop height={H} label="Tela do cartão no Hedge: fatura de outubro, limite usado e as transações da fatura. Dados fictícios.">
    <TelaApp className="p-4 sm:rounded">
      <TelaCartao />
    </TelaApp>
  </ScreenCrop>
);

export const CropMetas = () => (
  <ScreenCrop height={H} label="Tela de limites de gasto do Hedge: quanto já foi usado de cada limite; Alimentação está quase no limite. Dados fictícios.">
    <TelaApp className="p-4 sm:rounded">
      <TelaMetas />
    </TelaApp>
  </ScreenCrop>
);

export const CropContas = () => (
  <ScreenCrop height={H} label="Tela de contas do Hedge: saldo total, a parte de cada conta e as entradas do mês. Dados fictícios.">
    <TelaApp className="p-4 sm:rounded">
      <TelaContas />
    </TelaApp>
  </ScreenCrop>
);

export const CropRelatorios = () => (
  <ScreenCrop height={H} label="Relatório mensal em PDF do Hedge: gastos de outubro por categoria e o total do mês. Dados fictícios.">
    <TelaApp className="p-4 sm:rounded">
      <TelaRelatorio />
    </TelaApp>
  </ScreenCrop>
);
