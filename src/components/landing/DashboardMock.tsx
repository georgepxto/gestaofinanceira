import { TelaApp, TelaInicio } from "./app/telas";
import { SALDO_HOJE, previsaoMock } from "./app/mock";
import { brl } from "./format";

/* O Início do app, com os mesmos componentes: saldo de hoje e o extrato até
   o fim do mês. `focus` realça a resposta da pergunta escolhida. */
export function DashboardMock({ focus }: { focus?: 0 | 1 | 2 }) {
  const p = previsaoMock();
  return (
    <div
      role="img"
      aria-label={`Início do Hedge com dados fictícios: saldo hoje ${brl(SALDO_HOJE)}, ${brl(p.vaoDevolver)} para receber de volta e ${brl(p.fimDoMes)} previstos para o fim do mês.`}
      className="w-full max-w-[420px]"
    >
      <div aria-hidden="true">
        <TelaApp className="p-5 sm:rounded">
          <TelaInicio destaque={focus} ultimos={[]} />
        </TelaApp>
      </div>
    </div>
  );
}
