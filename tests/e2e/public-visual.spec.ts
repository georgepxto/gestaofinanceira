import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function attachScreenshot(page: Page, name: string, testInfo: TestInfo) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

test.describe("Fluxo publico visual", () => {
  test("landing e login renderizam corretamente", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Seu futuro financeiro/i })).toBeVisible();
    await attachScreenshot(page, "01-landing", testInfo);

    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Hedge" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar/i })).toBeVisible();
    await attachScreenshot(page, "02-login", testInfo);
  });

  test("alterna telas de cadastro e recuperar senha", async ({ page }, testInfo) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Crie sua conta")).toBeVisible();
    await attachScreenshot(page, "03-signup", testInfo);

    await page.getByRole("button", { name: "Fazer login" }).click();
    await expect(page.getByText("Controle de finanças")).toBeVisible();

    await page.getByRole("button", { name: "Esqueceu a senha?" }).click();
    await expect(page.getByText("Recuperar senha")).toBeVisible();
    await attachScreenshot(page, "04-forgot-password", testInfo);
  });
});
