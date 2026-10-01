import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { format, subDays } from "date-fns";
import { ChevronDown, X } from "lucide-react";
import { useFocusTrap } from "../../hooks";
import { usePresenca } from "../../hooks/usePresenca";
import { Button } from "./Button";

/* ═══════════════════════════════════════════════════════════════════════
   O formulário do app. Um só, para criar e editar qualquer coisa.

   Celular: painel que sobe de baixo, com alça de arraste.
   Desktop: painel de 440px que entra pela direita.

   Ordem, sempre: 1. título igual ao botão que abriu; 2. valor grande (quando
   o formulário tem valor); 3. campos essenciais; 4. chips; 5. Débito/Crédito;
   6. data em chips; 7. "Mais opções"; 8. rodapé fixo com o botão laranja.
   ═══════════════════════════════════════════════════════════════════════ */

interface FormSheetProps {
  aberto: boolean;
  /** Igual ao rótulo do botão que abriu ("Novo empréstimo"). */
  titulo: string;
  onFechar: () => void;
  onEnviar: () => void;
  rotuloEnviar: string;
  enviando?: boolean;
  /** Botão principal desabilitado (valor vazio, por exemplo). */
  podeEnviar?: boolean;
  erro?: string | null;
  /** Aviso em uma linha --fg-2 abaixo do título. Sem caixa âmbar. */
  aviso?: ReactNode;
  /** O <MoneyInput tamanho="heroi">, quando o formulário tem valor. */
  valor?: ReactNode;
  /** Ação extra no rodapé, discreta (excluir, na edição). */
  acaoRodape?: ReactNode;
  /** Rótulo do botão de fechar ("Pular por agora" nas boas-vindas). */
  rotuloCancelar?: string;
  /** Ação sem volta (zerar, excluir): o botão principal fica vermelho. */
  perigo?: boolean;
  children: ReactNode;
}

const DISTANCIA_PARA_FECHAR = 96;

export function FormSheet({
  aberto,
  titulo,
  onFechar,
  onEnviar,
  rotuloEnviar,
  enviando = false,
  podeEnviar = true,
  erro,
  aviso,
  valor,
  acaoRodape,
  rotuloCancelar = "Cancelar",
  perigo = false,
  children,
}: FormSheetProps) {
  const painelRef = useFocusTrap<HTMLFormElement>(enviando ? undefined : onFechar, aberto);
  // Ao fechar, o painel desce (ou sai pela direita) com o conteúdo de antes.
  const presenca = usePresenca(aberto, { titulo, aviso, valor, children, acaoRodape, rotuloEnviar });
  const v = presenca.saindo ? presenca.congelado : { titulo, aviso, valor, children, acaoRodape, rotuloEnviar };
  const [arraste, setArraste] = useState(0);
  const inicioArraste = useRef<number | null>(null);

  // Fundo parado enquanto o painel está aberto.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) setArraste(0);
  }, [aberto]);

  if (!presenca.montado) return null;
  const saindo = presenca.saindo;

  // Alça de arraste (celular): puxar para baixo mais que 96px fecha.
  const aoTocar = (e: React.PointerEvent) => {
    inicioArraste.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const aoMover = (e: React.PointerEvent) => {
    if (inicioArraste.current === null) return;
    setArraste(Math.max(0, e.clientY - inicioArraste.current));
  };
  const aoSoltar = () => {
    if (inicioArraste.current === null) return;
    inicioArraste.current = null;
    if (arraste > DISTANCIA_PARA_FECHAR && !enviando) onFechar();
    else setArraste(0);
  };

  return createPortal(
    <div className={`fixed inset-0 z-modal ${saindo ? "pointer-events-none" : ""}`}>
      <div
        className={`absolute inset-0 bg-scrim ${saindo ? "fundo-sai" : "fundo-entra"}`}
        aria-hidden="true"
        /* ds-ok: fundo de dispensa. Teclado fecha no Esc e no Cancelar — o fundo não entra na ordem de foco de propósito */
        onClick={enviando ? undefined : onFechar}
      />

      <form
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-sheet-titulo"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (podeEnviar && !enviando) onEnviar();
        }}
        style={arraste ? { transform: `translateY(${arraste}px)`, transition: "none" } : undefined}
        className={`absolute flex flex-col bg-surface-1
          inset-x-0 bottom-0 max-h-[92dvh] rounded-t
          md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:max-h-none md:rounded-none
          transition-transform duration-200 ${saindo ? "painel-sai" : "painel-entra"}`}
      >
        {/* Cabeçalho */}
        <div className="shrink-0">
          <div
            className="md:hidden h-6 flex items-center justify-center cursor-grab touch-none"
            onPointerDown={aoTocar}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSoltar}
            aria-hidden="true"
          >
            <span className="w-9 h-1 rounded-sm bg-surface-3" />
          </div>
          <div className="flex items-start justify-between gap-3 px-5 md:px-6 pt-1 md:pt-6">
            <div className="min-w-0">
              <h2 id="form-sheet-titulo" className="text-lg font-medium text-fg">
                {v.titulo}
              </h2>
              {v.aviso && <p className="mt-1 text-sm text-fg-2">{v.aviso}</p>}
            </div>
            <button
              type="button"
              onClick={onFechar}
              disabled={enviando}
              aria-label="Fechar"
              className="w-11 h-11 md:w-8 md:h-8 -mr-3 md:-mr-2 -mt-2 md:-mt-1 shrink-0 rounded flex items-center justify-center text-fg-3 hover:text-fg transition-colors"
            >
              <X className="w-5 h-5 md:w-4 md:h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-6 pb-6">
          {v.valor && <div className="pt-6 pb-7">{v.valor}</div>}
          <div className={`space-y-5 ${v.valor ? "" : "pt-5"}`}>{v.children}</div>
        </div>

        {/* Rodapé fixo */}
        <div className="shrink-0 px-5 md:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-6 border-t border-line">
          {erro && (
            <p role="alert" className="mb-3 text-sm text-danger-ink">
              {erro}
            </p>
          )}
          <div className="grid gap-2">
            <Button type="submit" variante={perigo ? "perigo" : "principal"} cheio carregando={enviando} disabled={!podeEnviar}>
              {v.rotuloEnviar}
            </Button>
            <Button variante="fantasma" cheio onClick={onFechar} disabled={enviando}>
              {rotuloCancelar}
            </Button>
            {v.acaoRodape}
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

/* ── Peças de formulário ───────────────────────────────────────────────── */

/** Classe dos campos de texto, select e data: --surface-2, fio --line, raio de 2px. */
export const campoClasse =
  "w-full h-11 px-3 bg-surface-2 border border-line rounded-sm text-fg placeholder:text-fg-3 outline-none focus:border-fg-3 transition-colors disabled:opacity-50";

interface CampoProps {
  rotulo: ReactNode;
  /** `id` do controle, para o <label for>. Sem ele o rótulo embrulha o controle. */
  htmlFor?: string;
  dica?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Rótulo em 12px, o controle e uma dica opcional embaixo. */
export function Campo({ rotulo, htmlFor, dica, children, className = "" }: CampoProps) {
  const cabeca = <span className="block text-xs text-fg-2 mb-2">{rotulo}</span>;
  return htmlFor ? (
    <div className={className}>
      <label htmlFor={htmlFor}>{cabeca}</label>
      {children}
      {dica && <p className="mt-1.5 text-xs text-fg-3">{dica}</p>}
    </div>
  ) : (
    <div className={className} role="group" aria-label={typeof rotulo === "string" ? rotulo : undefined}>
      {cabeca}
      {children}
      {dica && <p className="mt-1.5 text-xs text-fg-3">{dica}</p>}
    </div>
  );
}

/** Chip de escolha dentro do formulário. O ativo inverte (--fg com texto --bg). */
export function Chip({
  ativo,
  onClick,
  children,
  disabled,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={ativo}
      className={`h-11 md:h-9 px-3 rounded-sm text-sm whitespace-nowrap transition-colors disabled:opacity-40 ${
        ativo ? "bg-surface-1 text-fg ring-1 ring-inset ring-fg-3" : "bg-surface-2 text-fg-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/** Uma linha de chips que quebra. */
export function Chips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

const hoje = () => format(new Date(), "yyyy-MM-dd");
const ontem = () => format(subDays(new Date(), 1), "yyyy-MM-dd");

/** Data como chips "Hoje / Ontem / Outra"; "Outra" abre o campo de data. */
export function EscolhaData({
  valor,
  onChange,
  rotulo = "Data",
}: {
  valor: string;
  onChange: (data: string) => void;
  rotulo?: string;
}) {
  const [outra, setOutra] = useState(() => valor !== hoje() && valor !== ontem());

  return (
    <Campo rotulo={rotulo}>
      <Chips>
        <Chip
          ativo={!outra && valor === hoje()}
          onClick={() => {
            setOutra(false);
            onChange(hoje());
          }}
        >
          Hoje
        </Chip>
        <Chip
          ativo={!outra && valor === ontem()}
          onClick={() => {
            setOutra(false);
            onChange(ontem());
          }}
        >
          Ontem
        </Chip>
        <Chip ativo={outra} onClick={() => setOutra(true)}>
          Outra
        </Chip>
      </Chips>
      {outra && (
        <input
          type="date"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-label={rotulo}
          className={`${campoClasse} mt-2 valor`}
        />
      )}
    </Campo>
  );
}

/** "Mais opções": o que a maior parte dos lançamentos não usa, recolhido. */
export function MaisOpcoes({
  children,
  abertoInicial = false,
  rotulo = "Mais opções",
}: {
  children: ReactNode;
  abertoInicial?: boolean;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full h-12 flex items-center justify-between text-sm text-fg-2 hover:text-fg transition-colors"
      >
        {rotulo}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-150 ${aberto ? "rotate-180" : ""}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>
      {aberto && <div className="space-y-5 pb-2">{children}</div>}
    </div>
  );
}

/**
 * Parcelas em chips: 1x a 12x, e "Mais" para digitar até `maximo` (48). O
 * preview "3x de R$ 70,80" fica abaixo quando há valor.
 */
export function EscolhaParcelas({
  valor,
  onChange,
  presets,
  maximo,
  total,
  formatar,
  disabled = false,
}: {
  valor: number;
  onChange: (parcelas: number) => void;
  /** Os chips fixos (PARCELAS_OPTIONS). */
  presets: number[];
  maximo: number;
  /** Valor total, para o preview por parcela. */
  total: number;
  formatar: (v: number) => string;
  disabled?: boolean;
}) {
  const maiorPreset = Math.max(...presets);
  const [livre, setLivre] = useState(valor > maiorPreset);
  const [texto, setTexto] = useState(valor > maiorPreset ? String(valor) : "");

  const confirmarTexto = () => {
    if (!texto) return;
    const n = Math.min(Math.max(parseInt(texto, 10) || 1, 1), maximo);
    setTexto(String(n));
    onChange(n);
  };

  return (
    <Campo rotulo="Parcelas">
      <Chips>
        {presets.map((n) => (
          <Chip
            key={n}
            disabled={disabled}
            ativo={!livre && valor === n}
            onClick={() => {
              setLivre(false);
              onChange(n);
            }}
          >
            {n}x
          </Chip>
        ))}
        <Chip disabled={disabled} ativo={livre} onClick={() => setLivre(true)}>
          Mais
        </Chip>
      </Chips>
      {livre && !disabled && (
        <input
          type="text"
          inputMode="numeric"
          value={texto}
          onChange={(e) => {
            if (!/^\d*$/.test(e.target.value)) return;
            setTexto(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (n >= 1 && n <= maximo) onChange(n);
          }}
          onBlur={confirmarTexto}
          placeholder={`De 1 a ${maximo}`}
          aria-label={`Número de parcelas, de 1 a ${maximo}`}
          className={`${campoClasse} mt-2 valor`}
        />
      )}
      {valor > 1 && total > 0 && (
        <p className="mt-2 text-sm text-fg-2">
          <span className="valor">
            {valor}x de {formatar(total / valor)}
          </span>
        </p>
      )}
    </Campo>
  );
}

/**
 * Pequeno extrato dentro do formulário ("Total do mês", "Já pago", "Restante"):
 * rótulo à esquerda, valor em mono à direita. A última linha pode vir em
 * destaque, separada por um fio.
 */
export function Extrato({
  linhas,
}: {
  linhas: { rotulo: ReactNode; valor: ReactNode; destaque?: boolean; tom?: "normal" | "atencao" }[];
}) {
  return (
    <dl className="bg-surface-2 rounded-sm px-4 py-1">
      {linhas.map((l, i) => (
        <div
          key={i}
          className={`flex items-baseline justify-between gap-4 py-2.5 ${l.destaque ? "border-t border-line" : ""}`}
        >
          <dt className={`text-sm ${l.destaque ? "text-fg" : "text-fg-2"}`}>{l.rotulo}</dt>
          <dd className={`valor text-sm ${l.tom === "atencao" ? "text-accent-ink" : "text-fg"}`}>{l.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
