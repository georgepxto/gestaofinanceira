import { format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
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
 * Fora do mês corrente, o próprio nome do mês vira o "voltar para hoje",
 * com um ícone pequeno ao lado. Antes era um botão "Hoje" que aparecia do
 * nada e esticava o seletor; agora a largura é fixa e nada pula.
 */
export const SeletorMes = ({ "data-tour": dataTour, className = "" }: SeletorMesProps) => {
  const { mesVisualizacao, navegarMes, irParaHoje } = useAppContext();
  const noMesCorrente = isSameMonth(mesVisualizacao, new Date());
  const mesAtual = format(new Date(), "MMMM", { locale: ptBR });

  const seta =
    "w-11 h-11 md:w-9 md:h-9 shrink-0 rounded-sm flex items-center justify-center text-fg-2 hover:text-fg hover:bg-surface-3 transition-colors";

  return (
    <div
      data-tour={dataTour}
      className={`inline-flex items-center justify-between bg-surface-2 rounded-sm ${className}`}
    >
      <button onClick={() => navegarMes("anterior")} aria-label="Mês anterior" className={seta}>
        <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <button
        type="button"
        onClick={irParaHoje}
        disabled={noMesCorrente}
        title={noMesCorrente ? undefined : `Voltar para ${mesAtual}`}
        aria-label={noMesCorrente ? undefined : `${formatMesAno(mesVisualizacao)}. Voltar para ${mesAtual}`}
        className="group w-[148px] h-11 md:h-9 inline-flex items-center justify-center gap-1.5 text-sm capitalize text-fg rounded-sm transition-colors enabled:hover:bg-surface-3 disabled:cursor-default"
      >
        <span aria-live="polite">{formatMesAno(mesVisualizacao)}</span>
        {!noMesCorrente && (
          <RotateCcw className="w-3 h-3 text-fg-3 group-hover:text-fg transition-colors" strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>

      <button onClick={() => navegarMes("proximo")} aria-label="Próximo mês" className={seta}>
        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
};

/** Nome do sistema de design para o mesmo componente. */
export const MonthSwitcher = SeletorMes;
