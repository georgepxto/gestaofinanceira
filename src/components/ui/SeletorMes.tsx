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
    "w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors";

  return (
    <div
      data-tour={dataTour}
      className={`inline-flex items-center bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl p-1 shadow-sm dark:shadow-none ${className}`}
    >
      <button onClick={() => navegarMes("anterior")} aria-label="Mês anterior" className={seta}>
        <ChevronLeft className="w-[18px] h-[18px]" />
      </button>

      <span className="min-w-[128px] text-center text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
        {formatMesAno(mesVisualizacao)}
      </span>

      {!noMesCorrente && (
        <button
          onClick={irParaHoje}
          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-1.5"
        >
          hoje
        </button>
      )}

      <button onClick={() => navegarMes("proximo")} aria-label="Próximo mês" className={seta}>
        <ChevronRight className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
};
