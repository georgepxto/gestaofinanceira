import { expect, test, type Page } from "@playwright/test";

// As telas de dentro, com uma conta que existe só para isto. Roda quando
// E2E_EMAIL e E2E_PASSWORD estão definidos; sem eles, é pulado.
//
// Tudo o que o teste cria se chama "[TESTE] …" e é apagado no fim (e no começo,
// para limpar o que uma execução interrompida tenha deixado). A pessoa
// "Teste Ana" fica cadastrada na conta de teste e é reaproveitada.

const EMAIL = process.env.E2E_EMAIL;
const SENHA = process.env.E2E_PASSWORD;
const PESSOA = "Teste Ana";

const AREAS: { link: string; rota: RegExp }[] = [
  { link: "Contas e receitas", rota: /\/carteira\/contas/ },
  { link: "Cartões", rota: /\/carteira\/cartoes/ },
  { link: "Lançamentos", rota: /\/gastos\/lancamentos/ },
  { link: "Limites", rota: /\/gastos\/limites/ },
  { link: "Pessoas", rota: /\/a-receber\/pessoas/ },
  { link: "Cobranças", rota: /\/a-receber\/aberto/ },
  { link: "Mês a mês", rota: /\/a-receber\/mes/ },
  { link: "Configurações", rota: /\/configuracoes/ },
  { link: "Início", rota: /\/$/ },
];

const folha = (page: Page) => page.getByRole("dialog").first();
/** O link da área na barra lateral (Configurações fica fora do <nav>, no rodapé dela). */
const linkDaArea = (page: Page, nome: string) => page.getByRole("link", { name: nome, exact: true }).first();

async function irPara(page: Page, link: string, rota: RegExp) {
  await linkDaArea(page, link).click();
  await expect(page).toHaveURL(rota);
  await expect(page.getByRole("heading", { level: 1 }).first(), `título da área ${link}`).toBeVisible({ timeout: 15_000 });
}

/** Apaga todo lançamento "[TESTE] …" do mês. */
async function limparLancamentos(page: Page) {
  await irPara(page, "Lançamentos", /\/gastos\/lancamentos/);
  await expect(page.getByText(/Lançamentos do mês|Nenhum/).first()).toBeVisible();
  const excluir = page.getByRole("button", { name: /^Excluir: \[TESTE\]/ });
  for (let i = 0; i < 20 && (await excluir.count()) > 0; i++) {
    const antes = await excluir.count();
    await excluir.first().click();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(excluir).toHaveCount(antes - 1);
  }
}

async function abrirNovoGasto(page: Page, valorEmCentavos: string, descricao: string) {
  await page.getByRole("button", { name: "Novo gasto" }).click();
  await expect(folha(page).getByRole("heading", { name: "Novo gasto" })).toBeVisible();
  await folha(page).getByLabel("Valor").fill(valorEmCentavos);
  await folha(page).getByLabel("Descrição").fill(descricao);
}

test.describe("Telas logadas", () => {
  test.skip(!EMAIL || !SENHA, "Defina E2E_EMAIL e E2E_PASSWORD (a conta só de teste) para rodar.");
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let page: Page;
  const erros: string[] = [];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (e) => erros.push(String(e)));

    await page.goto("/login");
    await page.getByRole("button", { name: "Continuar com email" }).click();
    await page.locator("#login-email").fill(EMAIL!);
    await page.locator("#login-senha").fill(SENHA!);
    await page.getByRole("button", { name: "Entrar", exact: true }).first().click();
    await expect(linkDaArea(page, "Início")).toBeVisible({ timeout: 20_000 });

    // Conta nova: as boas-vindas abrem sozinhas. O teste não cadastra conta.
    const pular = page.getByRole("button", { name: "Pular por agora" });
    if (await pular.isVisible({ timeout: 4000 }).catch(() => false)) await pular.click();

    await limparLancamentos(page);
  });

  test.afterAll(async () => {
    if (!page) return;
    await limparLancamentos(page).catch(() => {});
    await page.close();
  });

  test("todas as áreas abrem sem erro", async () => {
    for (const { link, rota } of AREAS) await irPara(page, link, rota);
    expect(erros).toEqual([]);
  });

  test("lança, edita e exclui um gasto", async () => {
    await irPara(page, "Lançamentos", /\/gastos\/lancamentos/);

    await abrirNovoGasto(page, "1234", "[TESTE] Padaria");
    await folha(page).getByRole("button", { name: "Adicionar gasto" }).click();
    const linha = page.getByRole("button", { name: "Editar: [TESTE] Padaria" });
    await expect(linha).toBeVisible();
    await expect(page.getByText("−R$ 12,34").first()).toBeVisible();

    await linha.click();
    await expect(folha(page).getByRole("heading", { name: "Editar gasto" })).toBeVisible();
    await folha(page).getByLabel("Valor").fill("2000");
    await folha(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("−R$ 20,00").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar: [TESTE] Padaria" })).toHaveCount(1);

    await page.getByRole("button", { name: "Excluir: [TESTE] Padaria" }).click();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByRole("button", { name: "Editar: [TESTE] Padaria" })).toHaveCount(0);
    expect(erros).toEqual([]);
  });

  test("excluir um gasto não leva junto outro de mesmo nome", async () => {
    await irPara(page, "Lançamentos", /\/gastos\/lancamentos/);
    for (const valor of ["1000", "3000"]) {
      await abrirNovoGasto(page, valor, "[TESTE] Mercado");
      await folha(page).getByRole("button", { name: "Adicionar gasto" }).click();
      await expect(folha(page)).toBeHidden();
    }
    const iguais = page.getByRole("button", { name: "Excluir: [TESTE] Mercado" });
    await expect(iguais).toHaveCount(2);

    await iguais.first().click();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(iguais).toHaveCount(1);

    // Continua um só depois de recarregar: o outro não foi apagado no banco.
    await page.reload();
    await expect(page.getByRole("button", { name: "Excluir: [TESTE] Mercado" })).toHaveCount(1);
  });

  test("gasto dividido cria a cobrança, e excluir o gasto leva a cobrança junto", async () => {
    await irPara(page, "Lançamentos", /\/gastos\/lancamentos/);
    await abrirNovoGasto(page, "5000", "[TESTE] Jantar");
    await folha(page).getByRole("button", { name: "Dividido", exact: true }).click();

    const jaCadastrada = folha(page).getByRole("button", { name: PESSOA, exact: true });
    if ((await jaCadastrada.count()) > 0) {
      if ((await jaCadastrada.getAttribute("aria-pressed")) !== "true") await jaCadastrada.click();
    } else {
      await folha(page).getByRole("button", { name: "+ Pessoa" }).click();
      await folha(page).getByLabel("Nome da pessoa").fill(PESSOA);
      await folha(page).getByRole("button", { name: "Adicionar", exact: true }).click();
    }
    // Dividido por igual: metade para cada um.
    await expect(folha(page).locator("#gasto-minha-parte")).toHaveValue("25,00");
    await folha(page).getByRole("button", { name: "Adicionar gasto" }).click();
    await expect(page.getByRole("button", { name: "Editar: [TESTE] Jantar" })).toBeVisible();

    await irPara(page, "Mês a mês", /\/a-receber\/mes/);
    await expect(page.getByText(PESSOA).first()).toBeVisible();
    await expect(page.getByText("R$ 25,00").first()).toBeVisible();

    await irPara(page, "Lançamentos", /\/gastos\/lancamentos/);
    await page.getByRole("button", { name: "Excluir: [TESTE] Jantar" }).click();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByRole("button", { name: "Editar: [TESTE] Jantar" })).toHaveCount(0);

    await irPara(page, "Mês a mês", /\/a-receber\/mes/);
    await expect(page.getByText("R$ 25,00")).toHaveCount(0);
    expect(erros).toEqual([]);
  });
});
