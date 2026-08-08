import { useCallback, useSyncExternalStore } from "react";
import {
  categoriasFunctions,
  isSupabaseConfigured,
  type CategoriaUsuario,
  type TipoCategoria,
} from "../lib/supabase";
import {
  CATEGORIAS_GASTO_PADRAO,
  CATEGORIA_PADRAO,
  chaveCategoria,
  sanitizarNomeCategoria,
} from "../utils/categories";
import { CATEGORIAS_RECEITA_PADRAO, CATEGORIA_RECEITA_PADRAO } from "../utils/receitas";

export type { TipoCategoria };

/**
 * Categorias personalizáveis — um store só para o app inteiro.
 *
 * Os dois formulários de gasto, o de receita, a tela de metas e a de
 * configurações precisam da mesma lista, e nenhum deles é filho do outro.
 * Passar por props exigiria atravessar quatro níveis; um store de módulo com
 * `useSyncExternalStore` deixa cada tela assinar direto e todas mudarem juntas
 * quando alguém edita a lista.
 *
 * Enquanto o usuário não tiver linha nenhuma no banco, vale a lista padrão do
 * código — é o comportamento que o app sempre teve. A primeira personalização
 * "materializa" o padrão em linhas de verdade; daí em diante a tabela manda.
 */

const CATEGORIAS_PADRAO: Record<TipoCategoria, string[]> = {
  gasto: CATEGORIAS_GASTO_PADRAO,
  receita: CATEGORIAS_RECEITA_PADRAO,
};

const FALLBACK_PADRAO: Record<TipoCategoria, string> = {
  gasto: CATEGORIA_PADRAO,
  receita: CATEGORIA_RECEITA_PADRAO,
};

const ROTULO_TIPO: Record<TipoCategoria, string> = {
  gasto: "gasto",
  receita: "receita",
};

interface EstadoCategorias {
  linhas: Record<TipoCategoria, CategoriaUsuario[]>;
  carregado: boolean;
  salvando: boolean;
}

const ESTADO_VAZIO: EstadoCategorias = {
  linhas: { gasto: [], receita: [] },
  carregado: false,
  salvando: false,
};

let estado: EstadoCategorias = ESTADO_VAZIO;
const ouvintes = new Set<() => void>();

function definirEstado(mudanca: Partial<EstadoCategorias>) {
  estado = { ...estado, ...mudanca };
  ouvintes.forEach((ouvinte) => ouvinte());
}

function definirLinhas(tipo: TipoCategoria, linhas: CategoriaUsuario[]) {
  definirEstado({ linhas: { ...estado.linhas, [tipo]: linhas } });
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

// ─── Modo demo (sem Supabase): a lista vive no localStorage ──────────────────

const chaveLocal = (tipo: TipoCategoria) => `categorias_${tipo}`;

function gerarId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `cat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerLocal(tipo: TipoCategoria): CategoriaUsuario[] {
  try {
    const salvo = localStorage.getItem(chaveLocal(tipo));
    return salvo ? (JSON.parse(salvo) as CategoriaUsuario[]) : [];
  } catch {
    return [];
  }
}

function gravarLocal(tipo: TipoCategoria, linhas: CategoriaUsuario[]) {
  try {
    localStorage.setItem(chaveLocal(tipo), JSON.stringify(linhas));
  } catch {
    // Cota cheia ou storage bloqueado: a lista continua valendo na sessão.
  }
}

// ─── Carga ──────────────────────────────────────────────────────────────────

/** Chamado pelo AppProvider quando o usuário entra. */
export async function carregarCategorias(): Promise<void> {
  if (!isSupabaseConfigured) {
    definirEstado({
      linhas: { gasto: lerLocal("gasto"), receita: lerLocal("receita") },
      carregado: true,
    });
    return;
  }

  const linhas = await categoriasFunctions.getAll();
  definirEstado({
    linhas: {
      gasto: linhas.filter((l) => l.tipo === "gasto"),
      receita: linhas.filter((l) => l.tipo === "receita"),
    },
    carregado: true,
  });
}

/** Chamado no logout — a lista do próximo usuário não pode vazar do anterior. */
export function limparCategorias(): void {
  estado = ESTADO_VAZIO;
  ouvintes.forEach((ouvinte) => ouvinte());
}

// ─── Escrita ────────────────────────────────────────────────────────────────

export interface ResultadoCategoria {
  ok: boolean;
  erro?: string;
}

const listaDe = (tipo: TipoCategoria): string[] =>
  estado.linhas[tipo].length > 0
    ? estado.linhas[tipo].map((l) => l.nome)
    : CATEGORIAS_PADRAO[tipo];

/**
 * Garante que a lista existe como linhas no banco. Devolve `null` se a gravação
 * falhou — quem chamou aborta em vez de mexer só na tela.
 */
async function garantirMaterializado(
  tipo: TipoCategoria
): Promise<CategoriaUsuario[] | null> {
  if (estado.linhas[tipo].length > 0) return estado.linhas[tipo];

  const padrao = CATEGORIAS_PADRAO[tipo];

  if (!isSupabaseConfigured) {
    const linhas = padrao.map((nome, i) => ({ id: gerarId(), tipo, nome, ordem: i }));
    gravarLocal(tipo, linhas);
    definirLinhas(tipo, linhas);
    return linhas;
  }

  const linhas = await categoriasFunctions.materializar(tipo, padrao);
  if (linhas.length === 0) return null;

  const ordenadas = [...linhas].sort((a, b) => a.ordem - b.ordem);
  definirLinhas(tipo, ordenadas);
  return ordenadas;
}

function nomeDuplicado(
  linhas: CategoriaUsuario[],
  nome: string,
  ignorarId?: string
): boolean {
  return linhas.some(
    (l) => l.id !== ignorarId && chaveCategoria(l.nome) === chaveCategoria(nome)
  );
}

function validarNome(nome: string): string | null {
  if (!sanitizarNomeCategoria(nome)) return "Dê um nome à categoria.";
  return null;
}

async function adicionar(
  tipo: TipoCategoria,
  nomeBruto: string
): Promise<ResultadoCategoria> {
  const nome = sanitizarNomeCategoria(nomeBruto);
  const invalido = validarNome(nome);
  if (invalido) return { ok: false, erro: invalido };

  if (nomeDuplicado(estado.linhas[tipo], nome) ||
      (estado.linhas[tipo].length === 0 &&
        CATEGORIAS_PADRAO[tipo].some((c) => chaveCategoria(c) === chaveCategoria(nome)))) {
    return { ok: false, erro: `Você já tem uma categoria chamada "${nome}".` };
  }

  definirEstado({ salvando: true });
  try {
    const linhas = await garantirMaterializado(tipo);
    if (!linhas) return { ok: false, erro: "Não foi possível salvar a categoria." };

    const ordem = linhas.length;

    if (!isSupabaseConfigured) {
      const atualizadas = [...linhas, { id: gerarId(), tipo, nome, ordem }];
      gravarLocal(tipo, atualizadas);
      definirLinhas(tipo, atualizadas);
      return { ok: true };
    }

    const criada = await categoriasFunctions.create(tipo, nome, ordem);
    if (!criada) return { ok: false, erro: "Não foi possível salvar a categoria." };

    definirLinhas(tipo, [...linhas, criada]);
    return { ok: true };
  } finally {
    definirEstado({ salvando: false });
  }
}

async function renomear(
  tipo: TipoCategoria,
  nomeAtual: string,
  nomeNovoBruto: string
): Promise<ResultadoCategoria> {
  const nomeNovo = sanitizarNomeCategoria(nomeNovoBruto);
  const invalido = validarNome(nomeNovo);
  if (invalido) return { ok: false, erro: invalido };
  if (nomeNovo === nomeAtual) return { ok: true };

  definirEstado({ salvando: true });
  try {
    const linhas = await garantirMaterializado(tipo);
    if (!linhas) return { ok: false, erro: "Não foi possível renomear a categoria." };

    const alvo = linhas.find((l) => chaveCategoria(l.nome) === chaveCategoria(nomeAtual));
    if (!alvo) return { ok: false, erro: "Categoria não encontrada." };

    if (nomeDuplicado(linhas, nomeNovo, alvo.id)) {
      return { ok: false, erro: `Você já tem uma categoria chamada "${nomeNovo}".` };
    }

    const atualizadas = linhas.map((l) =>
      l.id === alvo.id ? { ...l, nome: nomeNovo } : l
    );

    if (!isSupabaseConfigured) {
      gravarLocal(tipo, atualizadas);
      definirLinhas(tipo, atualizadas);
      return { ok: true };
    }

    const salvou = await categoriasFunctions.rename(alvo.id, nomeNovo);
    if (!salvou) return { ok: false, erro: "Não foi possível renomear a categoria." };

    // Os lançamentos guardam o nome, não o id: sem esta propagação o histórico
    // ficaria numa categoria que sumiu da lista.
    await categoriasFunctions.aplicarRenomeacao(tipo, alvo.nome, nomeNovo);
    definirLinhas(tipo, atualizadas);
    return { ok: true };
  } finally {
    definirEstado({ salvando: false });
  }
}

async function remover(
  tipo: TipoCategoria,
  nome: string
): Promise<ResultadoCategoria> {
  if (listaDe(tipo).length <= 1) {
    return {
      ok: false,
      erro: `Você precisa de pelo menos uma categoria de ${ROTULO_TIPO[tipo]}.`,
    };
  }

  definirEstado({ salvando: true });
  try {
    const linhas = await garantirMaterializado(tipo);
    if (!linhas) return { ok: false, erro: "Não foi possível excluir a categoria." };

    const alvo = linhas.find((l) => chaveCategoria(l.nome) === chaveCategoria(nome));
    if (!alvo) return { ok: false, erro: "Categoria não encontrada." };

    const restantes = linhas.filter((l) => l.id !== alvo.id);

    if (!isSupabaseConfigured) {
      gravarLocal(tipo, restantes);
      definirLinhas(tipo, restantes);
      return { ok: true };
    }

    const excluiu = await categoriasFunctions.delete(alvo.id);
    if (!excluiu) return { ok: false, erro: "Não foi possível excluir a categoria." };

    await categoriasFunctions.aplicarSubstituicao(
      tipo,
      alvo.nome,
      substitutoPara(tipo, restantes)
    );
    definirLinhas(tipo, restantes);
    return { ok: true };
  } finally {
    definirEstado({ salvando: false });
  }
}

/**
 * Para onde vão os lançamentos da categoria excluída: a categoria-lixeira do
 * tipo ("Outros" / "Outras Receitas") se ela sobreviveu, senão a primeira da
 * lista. Nunca fica vazio — lançamento sem categoria some do gráfico.
 */
function substitutoPara(tipo: TipoCategoria, restantes: CategoriaUsuario[]): string {
  const padrao = restantes.find(
    (l) => chaveCategoria(l.nome) === chaveCategoria(FALLBACK_PADRAO[tipo])
  );
  return padrao ? padrao.nome : restantes[0].nome;
}

/**
 * Categoria pré-selecionada num lançamento novo: a categoria-lixeira do tipo
 * enquanto ela existir, senão a primeira da lista da pessoa. Leitura direta do
 * store — serve aos hooks de formulário, que não são componentes.
 *
 * Não confundir com `CATEGORIA_PADRAO`, que é a etiqueta de LEITURA de registro
 * sem categoria e continua fixa: mudar a lista não pode reescrever o passado.
 */
export function categoriaPadraoAtual(tipo: TipoCategoria): string {
  const lista = listaDe(tipo);
  const padrao = lista.find(
    (nome) => chaveCategoria(nome) === chaveCategoria(FALLBACK_PADRAO[tipo])
  );
  return padrao ?? lista[0] ?? FALLBACK_PADRAO[tipo];
}

/** Quantos lançamentos usam a categoria — a tela avisa antes de excluir. */
export function contarUsosCategoria(tipo: TipoCategoria, nome: string): Promise<number> {
  if (!isSupabaseConfigured) return Promise.resolve(0);
  return categoriasFunctions.contarUsos(tipo, nome);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseCategorias {
  /** A lista que vale agora: a personalizada, ou o padrão de fábrica. */
  categorias: string[];
  /** `false` = ainda no padrão do código, nada gravado no banco. */
  personalizado: boolean;
  carregado: boolean;
  salvando: boolean;
  adicionar: (nome: string) => Promise<ResultadoCategoria>;
  renomear: (nomeAtual: string, nomeNovo: string) => Promise<ResultadoCategoria>;
  remover: (nome: string) => Promise<ResultadoCategoria>;
  /** Para onde iriam os lançamentos se esta categoria fosse excluída. */
  substitutoAoExcluir: (nome: string) => string | null;
}

export function useCategorias(tipo: TipoCategoria): UseCategorias {
  const snapshot = useSyncExternalStore(assinar, () => estado, () => estado);

  const linhas = snapshot.linhas[tipo];
  const personalizado = linhas.length > 0;
  const categorias = personalizado ? linhas.map((l) => l.nome) : CATEGORIAS_PADRAO[tipo];

  const substitutoAoExcluir = useCallback(
    (nome: string) => {
      const lista = estado.linhas[tipo].length > 0
        ? estado.linhas[tipo]
        : CATEGORIAS_PADRAO[tipo].map((n, i) => ({ id: n, tipo, nome: n, ordem: i }));
      const restantes = lista.filter(
        (l) => chaveCategoria(l.nome) !== chaveCategoria(nome)
      );
      return restantes.length > 0 ? substitutoPara(tipo, restantes) : null;
    },
    [tipo]
  );

  return {
    categorias,
    personalizado,
    carregado: snapshot.carregado,
    salvando: snapshot.salvando,
    adicionar: useCallback((nome: string) => adicionar(tipo, nome), [tipo]),
    renomear: useCallback(
      (nomeAtual: string, nomeNovo: string) => renomear(tipo, nomeAtual, nomeNovo),
      [tipo]
    ),
    remover: useCallback((nome: string) => remover(tipo, nome), [tipo]),
    substitutoAoExcluir,
  };
}
