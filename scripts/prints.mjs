// Prints do app em 390px e 1440px, nos dois temas.
//
//   E2E_EMAIL=… E2E_PASSWORD=… node scripts/prints.mjs <pasta-de-saída> [rota …]
//
// Espera o dev server em http://127.0.0.1:4173 (npm run dev -- --port 4173).
// Sem credenciais, fotografa só as telas públicas.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.PRINTS_BASE ?? "http://127.0.0.1:4173";
const [saida = "prints", ...rotasPedidas] = process.argv.slice(2);
const EMAIL = process.env.E2E_EMAIL;
const SENHA = process.env.E2E_PASSWORD;

const ROTAS = rotasPedidas.length
  ? rotasPedidas
  : EMAIL
    ? [
        "/",
        "/gastos/lancamentos",
        "/gastos/metas",
        "/carteira/contas",
        "/carteira/cartoes",
        "/a-receber/pessoas",
        "/a-receber/aberto",
        "/a-receber/mes",
        "/configuracoes",
      ]
    : ["/login"];

const LARGURAS = [
  { nome: "390", width: 390, height: 844, mobile: true },
  { nome: "1440", width: 1440, height: 900, mobile: false },
];

await mkdir(saida, { recursive: true });
// O Chrome instalado na máquina: dispensa baixar o Chromium do Playwright.
const browser = await chromium.launch({ channel: process.env.PRINTS_CHANNEL ?? "chrome" });

async function contexto(largura, tema, estado) {
  const ctx = await browser.newContext({
    viewport: { width: largura.width, height: largura.height },
    deviceScaleFactor: largura.mobile ? 2 : 1,
    isMobile: largura.mobile,
    hasTouch: largura.mobile,
    reducedMotion: "reduce",
    storageState: estado,
  });
  await ctx.addInitScript((t) => {
    try { localStorage.setItem("theme", t); } catch { /* sem storage */ }
  }, tema);
  return ctx;
}

let estado;
if (EMAIL && SENHA) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  const mostrar = page.getByRole("button", { name: /e-?mail/i }).first();
  if (await mostrar.isVisible().catch(() => false)) await mostrar.click();
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-senha").fill(SENHA);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  estado = await ctx.storageState();
  await ctx.close();
}

for (const largura of LARGURAS) {
  for (const tema of ["dark", "light"]) {
    const ctx = await contexto(largura, tema, estado);
    const page = await ctx.newPage();
    for (const rota of ROTAS) {
      await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(900);
      const nome = (rota === "/" ? "dashboard" : rota.slice(1).replaceAll("/", "-")) || "raiz";
      await page.screenshot({ path: join(saida, `${nome}_${largura.nome}_${tema}.png`), fullPage: true });
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`prints em ${saida}`);
