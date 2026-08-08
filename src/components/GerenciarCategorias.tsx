import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useAppContext } from "../context";
import { useCategorias, contarUsosCategoria, type TipoCategoria } from "../hooks/useCategorias";
import { CATEGORIA_NOME_MAX } from "../utils/categories";
import { toast } from "./ui/Toaster";
import { Card } from "./ui/Card";
import { Rotulo } from "./ui/Rotulo";

const ABAS: { tipo: TipoCategoria; label: string; singular: string }[] = [
  { tipo: "gasto", label: "Gastos", singular: "gasto" },
  { tipo: "receita", label: "Receitas", singular: "receita" },
];

const INPUT_CLASS =
  "h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]";

const BOTAO_ICONE_CLASS =
  "p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";

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
    <Card as="section" padding="nenhum">
      <button
        type="button"
        onClick={alternarAberto}
        aria-expanded={aberto}
        className="w-full flex items-center gap-3 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
      >
        <Tags className="w-5 h-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
            Categorias
          </h2>
          {/* O resumo fechado responde "quantas eu tenho?" sem abrir nada. */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {gasto.categorias.length} de gasto · {receita.categorias.length} de receita
            {gasto.personalizado || receita.personalizado ? "" : " · lista padrão"}
          </p>
        </div>
        {aberto ? (
          <ChevronUp className="w-5 h-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
        )}
      </button>

      {aberto && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 min-w-0">
              {personalizado
                ? "Sua lista — é ela que aparece ao lançar e nos gráficos."
                : "Você está na lista padrão. Personalize à vontade."}
            </p>

            {/* SEGMENTADO gastos/receitas */}
            <div
              className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] p-1 rounded-xl"
              role="radiogroup"
              aria-label="Tipo de categoria"
            >
              {ABAS.map((aba) => (
                <button
                  key={aba.tipo}
                  onClick={() => trocarAba(aba.tipo)}
                  role="radio"
                  aria-checked={tipo === aba.tipo}
                  className={`px-3.5 py-2 rounded-lg text-sm transition-colors ${
                    tipo === aba.tipo
                      ? "bg-white dark:bg-white/[0.10] text-zinc-900 dark:text-zinc-50 shadow-sm dark:shadow-none font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                  }`}
                >
                  {aba.label}
                </button>
              ))}
            </div>
          </div>

          <Rotulo className="mb-2">{categorias.length} categorias</Rotulo>

          <ul className="divide-y divide-zinc-100 dark:divide-white/[0.05] border-y border-zinc-100 dark:border-white/[0.05]">
            {categorias.map((nome) => (
              <li key={nome} className="py-2">
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
                      className={`flex-1 min-w-0 ${INPUT_CLASS}`}
                    />
                    <button
                      onClick={() => handleRenomear(nome)}
                      disabled={salvando}
                      aria-label="Salvar nome"
                      className={`${BOTAO_ICONE_CLASS} text-emerald-600 dark:text-emerald-400 disabled:opacity-50`}
                    >
                      {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEmEdicao(null)}
                      aria-label="Cancelar edição"
                      className={BOTAO_ICONE_CLASS}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 text-sm text-zinc-800 dark:text-zinc-100 truncate">
                      {nome}
                    </span>
                    <button
                      onClick={() => abrirEdicao(nome)}
                      aria-label={`Renomear ${nome}`}
                      className={BOTAO_ICONE_CLASS}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExcluir(nome)}
                      disabled={categorias.length <= 1}
                      aria-label={`Excluir ${nome}`}
                      className={`${BOTAO_ICONE_CLASS} hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <Trash2 className="w-4 h-4" />
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
              placeholder={tipo === "gasto" ? "Ex: Pet, Academia, Viagem…" : "Ex: Dividendos, Bônus…"}
              aria-label="Nome da nova categoria"
              className={`flex-1 min-w-[180px] ${INPUT_CLASS}`}
            />
            <button
              onClick={handleAdicionar}
              disabled={salvando || !nova.trim()}
              className="inline-flex items-center gap-2 h-11 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </button>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
            Renomear atualiza os lançamentos que já usavam a categoria. Excluir
            move esses lançamentos para outra categoria — nenhum valor se perde.
          </p>
        </div>
      )}
    </Card>
  );
};
