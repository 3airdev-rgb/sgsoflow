import { expect, test } from "@playwright/test";
test("exibe a tela de login estrutural", async ({ page }) => { await page.goto("/login"); await expect(page.getByRole("heading", { name: "Aero SGSO" })).toBeVisible(); await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible(); });
