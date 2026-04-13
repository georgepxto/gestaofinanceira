import { appendFile, writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const reportPaths = new Map<string, string>();
const stepCounters = new Map<string, number>();

async function initTxtReport(testInfo: TestInfo, title: string) {
  const now = new Date();
  const path = testInfo.outputPath("test-execution-report.txt");
  reportPaths.set(testInfo.outputDir, path);

  await writeFile(
    path,
    [
      "===============================================",
      "RELATORIO DETALHADO DE EXECUCAO E2E",
      "===============================================",
      `Titulo: ${title}`,
      `Dia da semana: ${now.toLocaleDateString("pt-BR", { weekday: "long" })}`,
      `Data/Hora inicio: ${now.toLocaleString("pt-BR")}`,
      "Arquivo base: tests/e2e/public-visual.spec.ts",
      "",
      "Formato:",
      "- CHECKLIST: botoes/acoes previstos para a secao",
      "- PASSO N: execucao cronologica com URL",
      "",
      "INICIO DA EXECUCAO",
      "-----------------------------------------------",
      "",
    ].join("\n"),
    "utf-8"
  );

  stepCounters.set(testInfo.outputDir, 0);
}

async function appendTxt(testInfo: TestInfo, message: string) {
  const path = reportPaths.get(testInfo.outputDir);
  if (!path) return;
  await appendFile(path, `${new Date().toLocaleString("pt-BR")} | ${message}\n`, "utf-8");
}

async function finalizeTxtReport(testInfo: TestInfo, status: "SUCESSO" | "FALHA") {
  const path = reportPaths.get(testInfo.outputDir);
  if (!path) return;
  await appendFile(
    path,
    [
      "",
      "-----------------------------------------------",
      `Status final: ${status}`,
      `Data/Hora fim: ${new Date().toLocaleString("pt-BR")}`,
      "FIM DA EXECUCAO",
      "===============================================",
      "",
    ].join("\n"),
    "utf-8"
  );
  await testInfo.attach("relatorio-execucao", { path, contentType: "text/plain" });
}

async function appendChecklist(testInfo: TestInfo, section: string, items: string[]) {
  await appendTxt(testInfo, `CHECKLIST | ${section}`);
  for (let i = 0; i < items.length; i += 1) {
    await appendTxt(testInfo, `  ${i + 1}. ${items[i]}`);
  }
}

async function appendStep(testInfo: TestInfo, detail: string) {
  const current = stepCounters.get(testInfo.outputDir) ?? 0;
  const next = current + 1;
  stepCounters.set(testInfo.outputDir, next);
  await appendTxt(testInfo, `PASSO ${next}: ${detail}`);
}

async function attachScreenshot(page: Page, name: string, testInfo: TestInfo) {
  await appendStep(testInfo, `Checkpoint ${name} confirmado | URL atual: ${page.url()}`);
}

test.describe("Fluxo publico visual", () => {
  test("landing e login renderizam corretamente", async ({ page }, testInfo) => {
    await initTxtReport(testInfo, "Fluxo publico - landing/login");

    try {
      await appendChecklist(testInfo, "Landing/Login", ["Entrar (landing)", "Entrar (login)"]);
      await page.goto("/");

      await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Seu futuro financeiro/i })).toBeVisible();
      await attachScreenshot(page, "01-landing", testInfo);

      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Hedge" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Entrar/i })).toBeVisible();
      await attachScreenshot(page, "02-login", testInfo);

      await finalizeTxtReport(testInfo, "SUCESSO");
    } catch (error) {
      await finalizeTxtReport(testInfo, "FALHA");
      throw error;
    }
  });

  test("alterna telas de cadastro e recuperar senha", async ({ page }, testInfo) => {
    await initTxtReport(testInfo, "Fluxo publico - cadastro/recuperacao");

    try {
      await appendChecklist(testInfo, "Cadastro/Recuperacao", ["Criar conta", "Fazer login", "Esqueceu a senha?"]);
      await page.goto("/login");

      await page.getByRole("button", { name: "Criar conta" }).click();
      await expect(page.getByText("Crie sua conta")).toBeVisible();
      await attachScreenshot(page, "03-signup", testInfo);

      await page.getByRole("button", { name: "Fazer login" }).click();
      await expect(page.getByText("Controle de finanças")).toBeVisible();

      await page.getByRole("button", { name: "Esqueceu a senha?" }).click();
      await expect(page.getByText("Recuperar senha")).toBeVisible();
      await attachScreenshot(page, "04-forgot-password", testInfo);

      await finalizeTxtReport(testInfo, "SUCESSO");
    } catch (error) {
      await finalizeTxtReport(testInfo, "FALHA");
      throw error;
    }
  });
});
