import { expect, test } from "@playwright/test";

// As telas de fora: a landing e o login. Não entram em conta nenhuma e não
// gravam nada — por isso rodam no CI a cada envio.

const titulo = (page: import("@playwright/test").Page, nome: string | RegExp) =>
  page.getByRole("heading", { level: 1, name: nome });

test.describe("Telas públicas", () => {
  test("a landing abre e leva ao login", async ({ page }) => {
    await page.goto("/");
    await expect(titulo(page, /Seu dinheiro deixa pistas/)).toBeVisible();

    await page.getByText("Entrar", { exact: true }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(titulo(page, "Entrar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar com email" })).toBeVisible();
  });

  test("o login alterna entre entrar, criar conta e recuperar senha", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(titulo(page, "Criar conta")).toBeVisible();

    await page.getByRole("button", { name: "Entrar", exact: true }).last().click();
    await expect(titulo(page, "Entrar")).toBeVisible();

    await page.getByRole("button", { name: "Continuar com email" }).click();
    await page.getByRole("button", { name: "Esqueceu a senha?" }).click();
    await expect(titulo(page, "Recuperar senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar link" })).toBeVisible();
  });
});
