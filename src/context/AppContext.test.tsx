// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppProvider, useAppContext } from "./AppContext";

// O contexto assina por campo: cada componente só redesenha quando muda um
// campo que ele leu. Roda no modo demonstração (sem banco), com o provider de
// verdade e todos os ganchos dele.

type Ctx = ReturnType<typeof useAppContext>;

function montar() {
  const desenhos = { formulario: 0, pessoas: 0, acoes: 0 };
  let ctx!: Ctx;
  const acoesVistas = new Set<unknown>();

  const LeFormulario = () => {
    desenhos.formulario++;
    const c = useAppContext();
    ctx = c;
    return <output data-testid="form">{String(c.showFormMeuGasto)}</output>;
  };
  const LePessoas = () => {
    desenhos.pessoas++;
    const { pessoas } = useAppContext();
    return <output data-testid="pessoas">{pessoas.join(",")}</output>;
  };
  const SoAcoes = () => {
    desenhos.acoes++;
    const { setShowFormMeuGasto, handleSaveMeuGasto } = useAppContext();
    acoesVistas.add(setShowFormMeuGasto).add(handleSaveMeuGasto);
    return null;
  };

  const tela = render(
    <AppProvider>
      <LeFormulario />
      <LePessoas />
      <SoAcoes />
    </AppProvider>
  );
  return { tela, desenhos, acoesVistas, ctx: () => ctx };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("useAppContext", () => {
  it("redesenha só quem lê o campo que mudou", async () => {
    const { tela, desenhos, ctx } = montar();
    await act(async () => {});
    const antes = { ...desenhos };

    await act(async () => ctx().setShowFormMeuGasto(true));

    expect(tela.getByTestId("form").textContent).toBe("true");
    expect(desenhos.formulario).toBeGreaterThan(antes.formulario);
    expect(desenhos.pessoas).toBe(antes.pessoas);
    expect(desenhos.acoes).toBe(antes.acoes);
  });

  it("quem lê o campo acompanha a mudança dele", async () => {
    const { tela, desenhos, ctx } = montar();
    await act(async () => {});
    const antes = { ...desenhos };

    const resposta = await act(async () => ctx().adicionarPessoa("Ana"));

    expect(resposta).toEqual({ nome: "Ana" });
    expect(tela.getByTestId("pessoas").textContent).toBe("Ana");
    expect(desenhos.pessoas).toBeGreaterThan(antes.pessoas);
    expect(desenhos.acoes).toBe(antes.acoes);
  });

  it("as ações têm identidade fixa e enxergam o estado mais recente", async () => {
    const { acoesVistas, ctx } = montar();
    await act(async () => {});
    const editar = ctx().setFormMeuGasto;

    await act(async () => ctx().setFormMeuGasto({ ...ctx().formMeuGasto, descricao: "Mercado" }));
    await act(async () => ctx().setShowFormMeuGasto(true));

    expect(ctx().setFormMeuGasto).toBe(editar);
    expect(ctx().formMeuGasto.descricao).toBe("Mercado");
    // setShowFormMeuGasto e handleSaveMeuGasto: as mesmas duas em todo render.
    expect(acoesVistas.size).toBe(2);
  });

  it("espalhar o contexto entrega todos os campos", async () => {
    const { ctx } = montar();
    await act(async () => {});
    const copia = { ...ctx() };
    expect(copia.pessoas).toEqual([]);
    expect(typeof copia.handleSaveMeuGasto).toBe("function");
  });
});
