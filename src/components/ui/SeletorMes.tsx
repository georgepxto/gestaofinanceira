import { isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppContext } from "../../context";
import { formatMesAno } from "../../utils/calculations";

interface SeletorMesProps {
  /** O tour guiado ancora passos no seletor; cada tela usa o seu nome. */
  "data-tour"?: string;
  className?: string;
}

/**
 * O mês que a tela está mostrando. Sete telas desenhavam esta pílula à mão e
 * duas delas navegavam num `useState` próprio — o usuário punha maio em
 * Lançamentos, abria o Dashboard e voltava para o mês corrente.
 *
 * Não recebe o mês por prop de propósito: se ele viesse de fora, dava para
 * passar um mês diferente do global e o defeito voltaria por outra porta.
 * Quem quer trocar de mês chama `navegarMes` no contexto, e todas as telas
 * seguem juntas.
 *
 * O "hoje" só aparece fora do mês corrente. Enquanto ficou sempre visível, era
 * um botão que na maior parte do tempo não fazia nada.
 */
export const SeletorMes = ({ "data-tour": dataTour, className = "" }: SeletorMesProps) => {
  const { mesVisualizacao, navegarMes, irParaHoje } = useAppContext();
  const noMesCorrente = isSameMonth(mesVisualizacao, new Date());

  const seta =
    "w-11 h-11 md:w-9 md:h-9 rounded-sm flex items-center justify-center text-fg-2 hover:text-fg hover:bg-surface-3 transition-colors";

  return (
    <div
      data-tour={dataTour}
      className={`inline-flex items-center justify-between bg-surface-2 rounded-sm ${className}`}
    >
      <button onClick={() => navegarMes("anterior")} aria-label="Mês anterior" className={seta}>
        <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <span className="min-w-[124px] text-center text-sm text-fg capitalize" aria-live="polite">
        {formatMesAno(mesVisualizacao)}
      </span>

      {!noMesCorrente && (
        <button
          onClick={irParaHoje}
          className="h-7 px-2 rounded-sm text-xs text-fg-2 hover:text-fg bg-surface-1 transition-colors"
        >
          Hoje
        </button>
      )}

      <button onClick={() => navegarMes("proximo")} aria-label="Próximo mês" className={seta}>
        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
};

/** Nome do sistema de design para o mesmo componente. */
export const MonthSwitcher = SeletorMes;
