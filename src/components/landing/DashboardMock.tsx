import { INICIO, InicioScreen } from "./app/screens";
import { brl } from "./format";

export function DashboardMock({ focus }: { focus?: 0 | 1 | 2 }) {
  return (
    <div
      role="img"
      aria-label={`Dashboard do Hedge com dados fictícios: saldo total ${brl(INICIO.saldoTotal)}, a receber ${brl(INICIO.aReceber)}, saldo livre ${brl(INICIO.saldoLivre)}, gastos dos últimos seis meses e os últimos gastos.`}
      className="w-full max-w-[400px]"
    >
      <div aria-hidden="true">
        <InicioScreen focus={focus} />
      </div>
    </div>
  );
}
