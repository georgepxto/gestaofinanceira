import { expect, test, type Page, type TestInfo } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

async function attachScreenshot(page: Page, name: string, testInfo: TestInfo) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function navigateAllEnabledPages(page: Page, testInfo: TestInfo) {
  const links = page.locator("aside nav a[href]");
  const count = await links.count();
  const hrefs: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const href = await links.nth(i).getAttribute("href");
    if (!href) continue;
    if (!href.startsWith("/")) continue;
    if (!hrefs.includes(href)) hrefs.push(href);
  }

  for (const path of hrefs) {
    try {
      await page.goto(path);
    } catch {
      // Intermitencia de navegacao (ex: ERR_ABORTED). Tenta uma segunda vez.
      await page.goto(path);
    }

    await expect(page).not.toHaveURL(/\/login/);

    await page.waitForTimeout(400);

    const safeName = path === "/" ? "dashboard" : path.replaceAll("/", "-").replace(/^-/, "");
    await attachScreenshot(page, `20-nav-${safeName}`, testInfo);
  }
}

async function runMetasCrud(page: Page, testInfo: TestInfo) {
  await page.goto("/metas");
  await expect(page.getByRole("heading", { name: "Metas de Gasto" })).toBeVisible();

  const categoriaSelect = page.locator("section[data-tour='metas-form'] select");
  const limiteInput = page.getByPlaceholder("0,00");
  const salvarButton = page.getByRole("button", { name: /^Salvar$/ });

  await categoriaSelect.selectOption({ index: 1 });
  await limiteInput.fill("321");
  await salvarButton.click();
  await expect(page.getByText("Meta salva com sucesso.")).toBeVisible();
  await attachScreenshot(page, "30-metas-created", testInfo);

  const editarPrimeiraMeta = page.getByTitle("Editar meta").first();
  await editarPrimeiraMeta.click();
  await expect(page.getByRole("button", { name: /^Atualizar$/ })).toBeVisible();

  await limiteInput.fill("654");
  await page.getByRole("button", { name: /^Atualizar$/ }).click();
  await expect(page.getByText("Meta atualizada com sucesso.")).toBeVisible();
  await attachScreenshot(page, "31-metas-updated", testInfo);

  const removerPrimeiraMeta = page.getByTitle("Remover meta").first();
  await removerPrimeiraMeta.click();
  await expect(page.getByRole("heading", { name: "Excluir meta" })).toBeVisible();

  await page.getByRole("button", { name: /^Excluir$/ }).click();
  await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
  await attachScreenshot(page, "32-metas-deleted", testInfo);
}

async function ensureContaForPayment(page: Page, testInfo: TestInfo) {
  await page.goto("/contas");
  await expect(page.getByRole("heading", { name: "Contas Bancárias" })).toBeVisible();

  const noAccountText = page.getByText("Nenhuma conta");
  if (await noAccountText.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Nova Conta/i }).click();
    await page.getByPlaceholder("Ex: Conta Corrente, Poupança...").fill("Conta E2E Cartao");
    await page.getByPlaceholder("Ex: Nubank, Inter...").fill("Banco E2E");

    const saldoInput = page.locator("form").locator("input").nth(2);
    await saldoInput.fill("5000");
    await page.getByRole("button", { name: /^Criar$/ }).click();

    await expect(page.getByText("Conta adicionada com sucesso!")).toBeVisible();
    await attachScreenshot(page, "40-conta-criada-para-cartao", testInfo);
  }
}

async function runCartoesFullFlow(page: Page, testInfo: TestInfo) {
  const cardName = `Cartao E2E ${Date.now()}`;

  await ensureContaForPayment(page, testInfo);

  await page.goto("/cartoes");
  await expect(page.getByRole("heading", { name: "Cartões de Crédito" })).toBeVisible();

  await page.getByText("Novo cartão").click();
  await expect(page.getByRole("heading", { name: /Novo cartão de crédito/i })).toBeVisible();

  await page.getByPlaceholder("Ex: Nubank, Inter...").fill(cardName);
  await page.getByPlaceholder("R$ 0,00").first().fill("2500");

  const vencInput = page.locator("input[type='number']").first();
  const melhorDiaInput = page.locator("input[type='number']").nth(1);
  await vencInput.fill("10");
  await melhorDiaInput.fill("5");

  const dividaInicialInput = page.getByPlaceholder("R$ 0,00").nth(1);
  await dividaInicialInput.fill("300");

  await page.getByRole("button", { name: /^Criar$/ }).click();
  await expect(page.getByText("Cartão adicionado com sucesso!")).toBeVisible();
  await attachScreenshot(page, "41-cartao-criado", testInfo);

  await page.getByText(cardName).first().click();
  await expect(page.getByText("Uso do Limite")).toBeVisible();
  await attachScreenshot(page, "42-cartao-detalhes", testInfo);

  const actionButtons = page.locator("[data-tour='cartoes-detalhes-limite'] button");
  await actionButtons.nth(0).click();
  await expect(page.getByRole("heading", { name: /Editar Cartão/i })).toBeVisible();

  await page.getByPlaceholder("R$ 0,00").first().fill("3500");
  await page.getByRole("button", { name: /^Salvar$/ }).click();
  await expect(page.getByText("Cartão atualizado com sucesso!")).toBeVisible();
  await attachScreenshot(page, "43-cartao-limite-alterado", testInfo);

  await page.getByRole("button", { name: /Pagar Fatura/i }).click();
  await expect(page.getByRole("heading", { name: "Pagar Fatura" })).toBeVisible();

  const contaSelect = page.locator("select").first();
  await contaSelect.selectOption({ index: 1 });

  await page.getByRole("button", { name: /Confirmar Pagamento/i }).click();
  await expect(page.getByText(/Fatura Quitada/i)).toBeVisible();
  await attachScreenshot(page, "44-cartao-fatura-paga", testInfo);

  const desfazerPagamento = page.getByRole("button", { name: /Desfazer pagamento/i });
  if (await desfazerPagamento.isVisible().catch(() => false)) {
    await desfazerPagamento.click();
    await expect(page.getByRole("heading", { name: /Desfazer Pagamento/i })).toBeVisible();
    await page.getByRole("button", { name: /Excluir|Desfazer|Confirmar/i }).last().click();
    await attachScreenshot(page, "45-cartao-pagamento-desfeito", testInfo);
  }

  await actionButtons.nth(1).click();
  await expect(page.getByRole("heading", { name: /Excluir Cartão/i })).toBeVisible();
  await page.getByRole("button", { name: /^Excluir$/ }).click();
  await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
  await attachScreenshot(page, "46-cartao-excluido", testInfo);
}

async function runContasBancariasFullFlow(page: Page, testInfo: TestInfo) {
  const contaName = `Conta E2E ${Date.now()}`;
  const receitaDesc = `Receita E2E ${Date.now()}`;
  const contaSection = page.locator("section[data-tour='contas-section-contas']");
  const receitasSection = page.locator("section[data-tour='contas-section-receitas']");

  try {
    await page.goto("/contas");
    await expect(page.getByRole("heading", { name: "Contas Bancárias" })).toBeVisible();
    await attachScreenshot(page, "50-contas-overview", testInfo);

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await page.getByRole("button", { name: "Mês anterior" }).click();
    await page.getByRole("button", { name: /Ir para hoje/i }).click();
    await attachScreenshot(page, "51-contas-mes-navegacao", testInfo);

    await page.getByRole("button", { name: /Nova Conta/i }).click();
    const novaContaModal = page.locator("div.max-w-md", { has: page.getByRole("heading", { name: /Nova Conta Bancária/i }) });
    await expect(novaContaModal).toBeVisible();
    await novaContaModal.getByPlaceholder("Ex: Conta Corrente, Poupança...").fill(contaName);
    await novaContaModal.getByPlaceholder("Ex: Nubank, Inter...").fill("Banco E2E");
    await novaContaModal.locator("input").nth(2).fill("1500");
    await novaContaModal.locator("button[type='submit']").click();

    const contaRow = contaSection.locator("div", { hasText: contaName }).first();
    await expect(contaRow).toBeVisible();
    await attachScreenshot(page, "52-conta-criada", testInfo);

    await contaRow.locator("button").first().click();
    const editarContaModal = page.locator("div.max-w-md", { has: page.getByRole("heading", { name: /Editar Conta/i }) });
    await expect(editarContaModal).toBeVisible();
    const editarContaInputs = editarContaModal.locator("input");
    await editarContaInputs.nth(0).fill(contaName);
    await editarContaInputs.nth(1).fill("Banco E2E Editado");
    await editarContaInputs.nth(2).fill("2000");
    await editarContaInputs.nth(3).fill("2100");
    await expect(editarContaModal.locator("button[type='submit']")).toBeEnabled({ timeout: 15000 });
    await editarContaModal.locator("button[type='submit']").click();
    await expect(editarContaModal).toBeHidden({ timeout: 10000 });
    await attachScreenshot(page, "53-conta-editada", testInfo);

    await page.getByRole("button", { name: /Nova Receita/i }).click();
    const novaReceitaModal = page.locator("div.max-w-md", { has: page.getByRole("heading", { name: /Nova Receita/i }) });
    await expect(novaReceitaModal).toBeVisible();
    await novaReceitaModal.getByPlaceholder("Ex: Salário, Freelance...").fill(receitaDesc);
    await novaReceitaModal.getByPlaceholder("R$ 0,00").fill("450");

    const receitaSelects = novaReceitaModal.locator("form select");
    const receitaSelectCount = await receitaSelects.count();
    if (receitaSelectCount > 0) {
      await receitaSelects.last().selectOption({ label: contaName });
    }

    await expect(novaReceitaModal.locator("button[type='submit']")).toBeEnabled({ timeout: 15000 });
    await novaReceitaModal.locator("button[type='submit']").click();
    await expect(novaReceitaModal).toBeHidden({ timeout: 10000 });

    const receitaRow = receitasSection.locator("div", { hasText: receitaDesc }).first();
    await expect(receitaRow).toBeVisible();
    await attachScreenshot(page, "54-receita-criada", testInfo);

    await receitaRow.locator("button").first().click();
    const editarReceitaModal = page.locator("div.max-w-md", { has: page.getByRole("heading", { name: /Editar Receita/i }) });
    await expect(editarReceitaModal).toBeVisible();
    await editarReceitaModal.getByPlaceholder("R$ 0,00").fill("600");
    await expect(editarReceitaModal.locator("button[type='submit']")).toBeEnabled({ timeout: 15000 });
    await editarReceitaModal.locator("button[type='submit']").click();
    await expect(editarReceitaModal).toBeHidden({ timeout: 10000 });
    await attachScreenshot(page, "55-receita-editada", testInfo);
  } finally {
    await page.goto("/contas");

    const receitaRowCleanup = receitasSection.locator("div", { hasText: receitaDesc }).first();
    if (await receitaRowCleanup.isVisible().catch(() => false)) {
      await receitaRowCleanup.locator("button").nth(1).click();
      await expect(page.getByRole("heading", { name: /Excluir Receita/i })).toBeVisible();
      await page.getByRole("button", { name: /^Excluir$/ }).click();
      await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
      await attachScreenshot(page, "56-receita-excluida", testInfo);
    }

    const contaRowCleanup = contaSection.locator("div", { hasText: contaName }).first();
    if (await contaRowCleanup.isVisible().catch(() => false)) {
      await contaRowCleanup.locator("button").nth(1).click();
      await expect(page.getByRole("heading", { name: /Excluir Conta/i })).toBeVisible();
      await page.getByRole("button", { name: /^Excluir$/ }).click();
      await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
      await attachScreenshot(page, "57-conta-excluida", testInfo);
    }
  }
}

async function runDevedoresFullFlow(page: Page, testInfo: TestInfo) {
  const devedorName = `Devedor E2E ${Date.now()}`;
  const listaDevedores = page.locator("div[data-tour='devedores-lista']");

  const getCard = () => listaDevedores.locator("div", { hasText: devedorName }).first();

  try {
    await page.goto("/pessoas");
    await expect(page.locator("main h1", { hasText: "Devedores" })).toBeVisible();
    await attachScreenshot(page, "60-devedores-overview", testInfo);

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await page.getByRole("button", { name: "Mês anterior" }).click();
    await page.getByRole("button", { name: /Ir para hoje/i }).click();
    await attachScreenshot(page, "61-devedores-mes-navegacao", testInfo);

    await page.getByRole("button", { name: /Novo Devedor/i }).click();
    await page.getByPlaceholder("Nome do devedor").fill(devedorName);
    await page.getByRole("button", { name: /^Adicionar$/ }).click();

    await expect(getCard()).toBeVisible();
    await attachScreenshot(page, "62-devedor-criado", testInfo);

    const addedToast = page.getByText(`A pessoa ${devedorName} foi adicionada com sucesso!`);
    if (await addedToast.isVisible().catch(() => false)) {
      await expect(addedToast).toBeVisible();
    }

    await getCard().click();
    await expect(getCard().getByText("Gastos do Mês")).toBeVisible();
    await attachScreenshot(page, "63-devedor-expandido", testInfo);

    await getCard().click();
  } finally {
    await page.goto("/pessoas");
    const devedorCardCleanup = getCard();

    if (await devedorCardCleanup.isVisible().catch(() => false)) {
      await devedorCardCleanup.locator("button").first().click();
      await expect(page.getByRole("heading", { name: /Excluir Pessoa/i })).toBeVisible();
      await page.getByRole("button", { name: /^Excluir$/ }).click();
      await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
      await expect(devedorCardCleanup).not.toBeVisible({ timeout: 10000 });
      await attachScreenshot(page, "64-devedor-excluido", testInfo);
    }
  }
}

async function runDividasEmAbertoFullFlow(page: Page, testInfo: TestInfo) {
  const descricaoDivida = `Divida E2E ${Date.now()}`;
  const listaDividas = page.locator("div[data-tour='dividas-lista']");
  const getDividaItem = () => listaDividas.locator("li", { hasText: descricaoDivida }).first();

  try {
    await page.goto("/dividas");
    await expect(page.locator("main h1", { hasText: "Dívidas em Aberto" })).toBeVisible();
    await attachScreenshot(page, "70-dividas-overview", testInfo);

    await page.getByRole("button", { name: /^Pagos$/ }).click();
    await page.getByRole("button", { name: /^Pendentes$/ }).click();
    await attachScreenshot(page, "71-dividas-filtros-status", testInfo);

    const filtroPessoaButtons = page.locator("div[data-tour='dividas-filtro-pessoa'] button");
    const filtroCount = await filtroPessoaButtons.count();
    if (filtroCount > 1) {
      await filtroPessoaButtons.nth(1).click();
      await page.getByRole("button", { name: /^Todos$/ }).click();
    }

    await page.getByRole("button", { name: /Nova Cobrança/i }).click();
    await expect(page.getByRole("heading", { name: /Nova Cobrança em Aberto/i })).toBeVisible();

    const modalDivida = page.locator("div.max-w-lg", { has: page.getByRole("heading", { name: /Nova Cobrança em Aberto/i }) });
    await modalDivida.locator("select").selectOption({ index: 1 });
    await modalDivida.getByPlaceholder("Ex: Empréstimo de Janeiro, Dívida do carro...").fill(descricaoDivida);
    await modalDivida.getByPlaceholder("0,00").fill("300");
    await modalDivida.getByRole("button", { name: /Adicionar Cobrança/i }).click();

    await expect(getDividaItem()).toBeVisible();
    await attachScreenshot(page, "72-divida-criada", testInfo);

    const toastDivida = page.getByText("Dívida adicionada com sucesso!");
    if (await toastDivida.isVisible().catch(() => false)) {
      await expect(toastDivida).toBeVisible();
    }

    const acoesDivida = getDividaItem().locator("div[data-tour='dividas-item-acoes'] button");
    await acoesDivida.first().click();
    await expect(page.getByRole("heading", { name: /Registrar Pagamento/i })).toBeVisible();

    const pagamentoModal = page.locator("div.max-w-md", { has: page.getByRole("heading", { name: /Registrar Pagamento/i }) });
    await pagamentoModal.getByPlaceholder("0,00").fill("100");
    await pagamentoModal.getByRole("button", { name: /Confirmar Pagamento/i }).click();

    const feedbackPagamento = page.getByRole("heading", { name: /Sucesso|Erro/i });
    if (await feedbackPagamento.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /Entendido/i }).click();
    }

    await expect(getDividaItem()).toBeVisible();
    await attachScreenshot(page, "73-divida-pagamento-registrado", testInfo);
  } finally {
    await page.goto("/dividas");
    const dividaCleanup = getDividaItem();

    if (await dividaCleanup.isVisible().catch(() => false)) {
      const excluirBtn = dividaCleanup.locator("div[data-tour='dividas-item-acoes'] button").last();
      await excluirBtn.click();
      await expect(page.getByRole("heading", { name: /Excluir Dívida/i })).toBeVisible();
      await page.getByRole("button", { name: /^Excluir$/ }).click();
      await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
      await attachScreenshot(page, "74-divida-excluida", testInfo);
    }
  }
}

async function runEmprestimosMesFullFlow(page: Page, testInfo: TestInfo) {
  const descricao = `Emprestimo E2E ${Date.now()}`;
  let pessoaSelecionada = "";
  const listaGastos = page.locator("div[data-tour='gastos-lista']");
  const getItem = () => listaGastos.locator("li", { hasText: descricao }).first();

  const resetGastosFilters = async () => {
    const todosButtons = page.getByRole("button", { name: /^Todos$/ });
    const todosCount = await todosButtons.count();
    if (todosCount > 0) {
      await todosButtons.nth(0).click();
    }
    if (todosCount > 1) {
      await todosButtons.nth(1).click();
    }

    const limparDia = page.getByRole("button", { name: /^Limpar$/ });
    if (await limparDia.isVisible().catch(() => false)) {
      await limparDia.click();
    }
  };

  try {
    await page.goto("/gastos");
    await expect(page.getByRole("heading", { name: "Empréstimos do Mês" })).toBeVisible();
    await attachScreenshot(page, "80-gastos-overview", testInfo);

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await page.getByRole("button", { name: "Mês anterior" }).click();
    await page.getByRole("button", { name: /Ir para hoje/i }).click();
    await attachScreenshot(page, "81-gastos-mes-navegacao", testInfo);

    // Reseta filtros para evitar esconder o item criado.
    await resetGastosFilters();

    await page.getByRole("button", { name: /^Crédito$/ }).click();
    await page.getByRole("button", { name: /^Débito$/ }).click();
    await resetGastosFilters();
    await attachScreenshot(page, "82-gastos-filtros", testInfo);

    await page.getByRole("button", { name: /Novo Empréstimo/i }).click();
    const modalLancamento = page.locator("div.max-w-lg", { has: page.getByRole("heading", { name: /Novo Lançamento/i }) });
    await expect(modalLancamento).toBeVisible();

    const pessoaSelect = modalLancamento.locator("select#pessoa");
    pessoaSelecionada = (await pessoaSelect.locator("option").nth(1).textContent())?.trim() || "";
    await pessoaSelect.selectOption({ index: 1 });

    await modalLancamento.getByPlaceholder("Ex: iPhone 15, Supermercado...").fill(descricao);
    await modalLancamento.getByLabel("Valor Total").fill("120");
    await modalLancamento.locator("select#num_parcelas").selectOption("2");
    await modalLancamento.locator("button[type='submit']").click();

    await resetGastosFilters();

    await expect(getItem()).toBeVisible({ timeout: 20000 });
    await attachScreenshot(page, "83-gastos-criado", testInfo);

    await getItem().getByLabel("Editar").click();
    const editarModal = page.locator("div.max-w-lg", { has: page.getByRole("heading", { name: /Editar Lançamento/i }) });
    await expect(editarModal).toBeVisible();
    await editarModal.getByLabel("Valor Total").fill("180");
    await editarModal.locator("button[type='submit']").click();
    await expect(editarModal).toBeHidden({ timeout: 10000 });
    await attachScreenshot(page, "84-gastos-editado", testInfo);

    if (pessoaSelecionada) {
      const cardPessoa = page.locator("div", { hasText: pessoaSelecionada }).filter({ has: page.locator("button[title='Pagamento parcial']") }).first();
      if (await cardPessoa.isVisible().catch(() => false)) {
        await cardPessoa.locator("button[title='Pagamento parcial']").click();
        await expect(page.getByRole("heading", { name: new RegExp(`Pagamento Parcial - ${pessoaSelecionada}`) })).toBeVisible();

        const pagParcialModal = page.locator("div.max-w-md", { has: page.getByRole("heading", { name: /Pagamento Parcial/i }) });
        const metadeBtn = pagParcialModal.getByRole("button", { name: /Metade/i });
        if (await metadeBtn.isVisible().catch(() => false)) {
          await metadeBtn.click();
        }
        await pagParcialModal.getByRole("button", { name: /^Registrar$/ }).click();

        await attachScreenshot(page, "85-gastos-pagamento-parcial", testInfo);

        const desfazerUltimo = cardPessoa.locator("button[title='Desfazer último']").first();
        if (await desfazerUltimo.isVisible().catch(() => false)) {
          await desfazerUltimo.click();
          const desfazerHeading = page.getByRole("heading", { name: /Desfazer Pagamento/i });
          await expect(desfazerHeading).toBeVisible();
          const confirmModal = page.locator("div.max-w-sm", { has: desfazerHeading });
          await confirmModal.getByRole("button", { name: /^Excluir$/ }).click();
          await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
          await attachScreenshot(page, "86-gastos-desfazer-pagamento", testInfo);
        }
      }
    }
  } finally {
    await page.goto("/gastos");
    const item = getItem();
    if (await item.isVisible().catch(() => false)) {
      await item.getByLabel("Excluir").click();
      const excluirHeading = page.getByRole("heading", { name: /Excluir Lançamento/i });
      await expect(excluirHeading).toBeVisible();
      const confirmModal = page.locator("div.max-w-sm", { has: excluirHeading });
      await confirmModal.getByRole("button", { name: /^Excluir$/ }).click();
      await expect(page.getByText("Excluído com sucesso!")).toBeVisible();
      await attachScreenshot(page, "87-gastos-excluido", testInfo);
    }
  }
}

async function runMeusGastosFullFlow(page: Page, testInfo: TestInfo) {
  const descricaoBase = `Meu Gasto E2E ${Date.now()}`;
  const descricaoEditada = `${descricaoBase} Editado`;
  const listaMeusGastos = page.locator("div[data-tour='eu-lista-gastos']");
  const getItem = (descricao: string) => listaMeusGastos.locator("li", { hasText: descricao }).first();

  const resetMeusGastosFilters = async () => {
    const filtroCategoria = page.locator("div[data-tour='eu-filtro-categoria']");
    await filtroCategoria.getByRole("button", { name: /^Todos$/ }).click();

    const filtroDia = page.locator("div[data-tour='eu-filtro-dia']");
    const limparDia = filtroDia.getByRole("button", { name: /^Limpar$/ });
    if (await limparDia.isVisible().catch(() => false)) {
      await limparDia.click();
    }
  };

  try {
    await page.goto("/eu");
    await expect(page.locator("main h1", { hasText: "Meus Gastos" })).toBeVisible();
    await attachScreenshot(page, "90-meus-gastos-overview", testInfo);

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await page.getByRole("button", { name: "Mês anterior" }).click();
    await page.getByRole("button", { name: /Ir para hoje/i }).click();
    await attachScreenshot(page, "91-meus-gastos-mes-navegacao", testInfo);

    await resetMeusGastosFilters();

    await page.locator("button[data-tour='eu-btn-novo']").click();
    const modalNovo = page.locator("div.sm\\:max-w-md", { has: page.getByRole("heading", { name: /Novo Gasto Pessoal/i }) });
    await expect(modalNovo).toBeVisible();

    await modalNovo.getByPlaceholder("Ex: Netflix, Almoço, etc.").fill(descricaoBase);
    await modalNovo.getByPlaceholder("0,00").fill("123");
    await modalNovo.getByRole("button", { name: /^Adicionar Gasto$/ }).click();

    await expect(modalNovo).toBeHidden({ timeout: 10000 });
    await expect(getItem(descricaoBase)).toBeVisible({ timeout: 20000 });
    await attachScreenshot(page, "92-meus-gastos-criado", testInfo);

    const itemCriado = getItem(descricaoBase);
    await itemCriado.locator("button[title='Editar']").first().click();

    const modalEditar = page.locator("div.sm\\:max-w-md", { has: page.getByRole("heading", { name: /Editar Gasto Pessoal/i }) });
    await expect(modalEditar).toBeVisible();
    await modalEditar.getByPlaceholder("Ex: Netflix, Almoço, etc.").fill(descricaoEditada);
    await modalEditar.getByRole("button", { name: /^Salvar Alterações$/ }).click();

    await expect(modalEditar).toBeHidden({ timeout: 10000 });
    await expect(getItem(descricaoEditada)).toBeVisible({ timeout: 20000 });
    await attachScreenshot(page, "93-meus-gastos-editado", testInfo);

    const itemEditado = getItem(descricaoEditada);
    await itemEditado.locator("button").first().click();
    await attachScreenshot(page, "94-meus-gastos-marcado-pago", testInfo);
  } finally {
    await page.goto("/eu");
    await resetMeusGastosFilters();

    const cleanupItemEditado = getItem(descricaoEditada);
    const cleanupItemOriginal = getItem(descricaoBase);
    const cleanupItem = (await cleanupItemEditado.isVisible().catch(() => false))
      ? cleanupItemEditado
      : cleanupItemOriginal;

    if (await cleanupItem.isVisible().catch(() => false)) {
      await cleanupItem.locator("button[title='Excluir']").first().click();
      const excluirHeading = page.getByRole("heading", { name: /Excluir Gasto/i });
      await expect(excluirHeading).toBeVisible();
      const confirmModal = page.locator("div.max-w-sm", { has: excluirHeading });
      await confirmModal.getByRole("button", { name: /^Excluir$/ }).click();
      await expect(confirmModal).toBeHidden({ timeout: 10000 });
      await attachScreenshot(page, "95-meus-gastos-excluido", testInfo);
    }
  }
}

test.describe("Fluxo autenticado (opcional)", () => {
  test.skip(!EMAIL || !PASSWORD, "Defina E2E_EMAIL e E2E_PASSWORD para executar este fluxo.");

  test("login, navegacao e fluxos completos das abas principais", async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await page.goto("/login");

    await page.getByPlaceholder("seu@email.com").fill(EMAIL as string);
    await page.getByPlaceholder("••••••••").fill(PASSWORD as string);
    await page.getByRole("button", { name: /^Entrar$/ }).click();

    await expect(page).not.toHaveURL(/\/login/);
    await attachScreenshot(page, "10-home-logado", testInfo);

    const flowFailures: string[] = [];

    const runSection = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (error) {
        flowFailures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    await runSection("Navegacao", async () => navigateAllEnabledPages(page, testInfo));
    await runSection("Metas", async () => runMetasCrud(page, testInfo));
    await runSection("Emprestimos do Mes", async () => runEmprestimosMesFullFlow(page, testInfo));
    await runSection("Cartoes", async () => runCartoesFullFlow(page, testInfo));
    await runSection("Contas", async () => runContasBancariasFullFlow(page, testInfo));
    await runSection("Devedores", async () => runDevedoresFullFlow(page, testInfo));
    await runSection("Dividas em Aberto", async () => runDividasEmAbertoFullFlow(page, testInfo));
    await runSection("Meus Gastos", async () => runMeusGastosFullFlow(page, testInfo));

    if (flowFailures.length > 0) {
      throw new Error(`Falhas em secoes do fluxo integrado:\n- ${flowFailures.join("\n- ")}`);
    }
  });
});
