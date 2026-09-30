import { useState } from "react";
import { Check, ChevronDown, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAppContext } from "../context";
import { useCategorias, contarUsosCategoria, type TipoCategoria } from "../hooks/useCategorias";
import { CATEGORIA_NOME_MAX, corDaCategoria } from "../utils/categories";
import { toast } from "./ui/Toaster";
import { Surface } from "./ui/Surface";
import { SegmentedControl } from "./ui/SegmentedControl";
import { PontoCategoria } from "./ui/PontoCategoria";
import { Button } from "./ui/Button";
import { campoClasse } from "./ui/FormSheet";

const ABAS: { tipo: TipoCategoria; label: string; singular: string }[] = [
  { tipo: "gasto", label: "Gastos", singular: "gasto" },
  { tipo: "receita", label: "Receitas", singular: "receita" },
];

const BOTAO_ICONE_CLASS =
  "w-9 h-9 shrink-0 rounded flex items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

/**
 * Gerência das categorias de lançamento.
 *
 * A lista padrão continua sendo a que todo mundo recebe; aqui a pessoa cria as
 * suas, renomeia e exclui. Renomear leva o nome novo para os lançamentos
 * antigos e excluir remaneja os que usavam a categoria — a alternativa seria
 * deixar histórico apontando para um nome que não existe mais e o gráfico
 * ganhar fatias fantasma.
 *
 * Nasce FECHADO, como as ações irreversíveis logo abaixo: catorze linhas de
 * lista abertas de cara empurrariam perfil, aparência e dados para fora da
 * primeira tela, e mexer em categoria é coisa que se faz de vez em quando. O
 * cabeçalho fechado já diz quantas são de cada tipo — quem só queria conferir
 * não precisa nem abrir.
 */
export const GerenciarCategorias = () => {
  const { setModalConfirm } = useAppContext();

  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoCategoria>("gasto");

  // Os dois tipos são lidos sempre: o cabeçalho fechado mostra a contagem de
  // ambos, e só o corpo depende da aba escolhida.
  const gasto = useCategorias("gasto");
  const receita = useCategorias("receita");
  const { categorias, personalizado, salvando, adicionar, renomear, remover, substitutoAoExcluir } =
    tipo === "gasto" ? gasto : receita;

  const [nova, setNova] = useState("");
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  const trocarAba = (novoTipo: TipoCategoria) => {
    setTipo(novoTipo);
    setNova("");
    setEmEdicao(null);
  };

  // Fechar o acordeão descarta o que estava sendo digitado: reabrir com um
  // rascunho de meia hora atrás no campo seria pior que reabrir limpo.
  const alternarAberto = () => {
    setAberto((estava) => {
      if (estava) {
        setNova("");
        setEmEdicao(null);
      }
      return !estava;
    });
  };

  const handleAdicionar = async () => {
    const { ok, erro } = await adicionar(nova);
    if (!ok) {
      toast.error(erro || "Não foi possível salvar a categoria.");
      return;
    }
    toast.success(`Categoria "${nova.trim()}" criada.`);
    setNova("");
  };

  const abrirEdicao = (nome: string) => {
    setEmEdicao(nome);
    setRascunho(nome);
  };

  const handleRenomear = async (nome: string) => {
    const { ok, erro } = await renomear(nome, rascunho);
    if (!ok) {
      toast.error(erro || "Não foi possível renomear a categoria.");
      return;
    }
    setEmEdicao(null);
    toast.success("Categoria renomeada. Os lançamentos antigos foram junto.");
  };

  const handleExcluir = async (nome: string) => {
    if (categorias.length <= 1) {
      const singular = ABAS.find((a) => a.tipo === tipo)!.singular;
      toast.error(`Você precisa de pelo menos uma categoria de ${singular}.`);
      return;
    }

    const usos = await contarUsosCategoria(tipo, nome);
    const substituto = substitutoAoExcluir(nome);
    const destino = usos > 0 && substituto
      ? ` ${usos} lançamento${usos > 1 ? "s" : ""} ${usos > 1 ? "passam" : "passa"} para "${substituto}".`
      : "";

    setModalConfirm({
      show: true,
      titulo: `Excluir "${nome}"?`,
      mensagem: `A categoria sai da lista de lançamento.${destino}`,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        const { ok, erro } = await remover(nome);
        if (!ok) {
          toast.error(erro || "Não foi possível excluir a categoria.");
          return;
        }
        toast.success(`Categoria "${nome}" excluída.`);
      },
    });
  };

  return (
    <Surface as="section" padding="nenhum">
      <button
        type="button"
        onClick={alternarAberto}
        aria-expanded={aberto}
        className="w-full flex items-center gap-3 px-4 md:px-5 min-h-[64px] text-left rounded"
      >
        <div className="flex-1 min-w-0 py-3">
          <h2 className="text-base font-medium text-fg">Categorias</h2>
          {/* O resumo fechado responde "quantas eu tenho?" sem abrir nada. */}
          <p className="text-xs text-fg-2 mt-0.5">
            {gasto.categorias.length} de gasto · {receita.categorias.length} de receita
            {gasto.personalizado || receita.personalizado ? "" : " · lista padrão"}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-fg-3 shrink-0 transition-transform duration-150 ${aberto ? "rotate-180" : ""}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div className="px-4 md:px-5 pb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <p className="text-sm text-fg-2 min-w-0">
              {personalizado
                ? "Sua lista: é ela que aparece ao lançar e nos gráficos."
                : "Você está na lista padrão. Personalize à vontade."}
            </p>
            <SegmentedControl
              rotulo="Tipo de categoria"
              tamanho="sm"
              segmentos={ABAS.map((aba) => ({
                chave: aba.tipo,
                rotulo: aba.label,
                ativo: tipo === aba.tipo,
                onClick: () => trocarAba(aba.tipo),
              }))}
            />
          </div>

          <ul className="divide-y divide-line border-y border-line">
            {categorias.map((nome) => (
              <li key={nome} className="py-1.5">
                {emEdicao === nome ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rascunho}
                      autoFocus
                      maxLength={CATEGORIA_NOME_MAX}
                      onChange={(e) => setRascunho(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenomear(nome);
                        if (e.key === "Escape") setEmEdicao(null);
                      }}
                      aria-label={`Novo nome para ${nome}`}
                      className={`flex-1 min-w-0 ${campoClasse}`}
                    />
                    <button
                      onClick={() => handleRenomear(nome)}
                      disabled={salvando}
                      aria-label="Salvar nome"
                      className={BOTAO_ICONE_CLASS}
                    >
                      {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                    <button onClick={() => setEmEdicao(null)} aria-label="Cancelar edição" className={BOTAO_ICONE_CLASS}>
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 min-h-[44px]">
                    <PontoCategoria cor={corDaCategoria(nome, categorias)} />
                    <span className="flex-1 min-w-0 text-[15px] md:text-sm text-fg break-words">{nome}</span>
                    <button onClick={() => abrirEdicao(nome)} aria-label={`Renomear ${nome}`} className={BOTAO_ICONE_CLASS}>
                      <Pencil className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleExcluir(nome)}
                      disabled={categorias.length <= 1}
                      aria-label={`Excluir ${nome}`}
                      className={`${BOTAO_ICONE_CLASS} hover:text-danger-ink`}
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-2 flex-wrap mt-4">
            <input
              type="text"
              value={nova}
              maxLength={CATEGORIA_NOME_MAX}
              onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nova.trim()) handleAdicionar();
              }}
              placeholder={tipo === "gasto" ? "Ex: pet, academia, viagem" : "Ex: dividendos, bônus"}
              aria-label="Nome da nova categoria"
              className={`flex-1 min-w-[180px] ${campoClasse}`}
            />
            <Button
              onClick={handleAdicionar}
              disabled={!nova.trim()}
              carregando={salvando}
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
              className="h-11"
            >
              Adicionar
            </Button>
          </div>

          <p className="text-xs text-fg-3 mt-3">
            Renomear atualiza os lançamentos que já usavam a categoria. Excluir move esses lançamentos para outra
            categoria: nenhum valor se perde. A cor vem da posição na lista.
          </p>
        </div>
      )}
    </Surface>
  );
};
