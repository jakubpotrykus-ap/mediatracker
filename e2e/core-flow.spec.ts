import { expect, test } from "@playwright/test";

test("complete private and public tracking flow", async ({ page, context }) => {
  const username = `e2e${Date.now()}`;
  await page.goto("/register");
  await page.getByLabel("Nazwa użytkownika").fill(username);
  await page.getByLabel("Hasło").fill("PlaywrightPassword123!");
  await page.getByRole("button", { name: "Zarejestruj się" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel("Nazwa użytkownika lub e-mail").fill(username);
  await page.getByLabel("Hasło").fill("PlaywrightPassword123!");
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/discover");
  await page.getByLabel("Szukaj").fill("Testowy");
  await expect(page.getByText("Testowy film")).toBeVisible();
  await page.getByText("Testowy film").locator("../..").getByRole("button", { name: "Dodaj do biblioteki" }).click();
  await page.getByText("Testowy serial").locator("../..").getByRole("button", { name: "Dodaj do biblioteki" }).click();

  await page.goto("/library");
  await page.getByRole("heading", { name: "Testowy film" }).locator("../..").getByRole("link", { name: "Szczegóły" }).click();
  await page.getByLabel("Liczba obejrzeń").fill("2");
  await page.getByRole("button", { name: "Dodaj obejrzenia" }).click();
  await expect(page.getByText(/100 min/).first()).toBeVisible();

  await page.goto("/library");
  await page.getByRole("heading", { name: "Testowy serial" }).locator("../..").getByRole("link", { name: "Szczegóły" }).click();
  await page.getByRole("button", { name: "Oznacz jako obejrzany" }).first().click();
  await page.getByRole("button", { name: "Oznacz jako obejrzany" }).first().click();
  await expect(page.getByText("Ukończony").last()).toBeVisible();

  await page.goto("/labels");
  await page.getByLabel("Nazwa").fill("mustWatch");
  await page.getByRole("button", { name: "Utwórz etykietę" }).click();
  await expect(page.getByText("mustWatch")).toBeVisible();
  await page.goto("/library");
  await page.getByRole("heading", { name: "Testowy film" }).locator("../..").getByRole("link", { name: "Szczegóły" }).click();
  await page.getByLabel("mustWatch").check();
  await page.getByRole("button", { name: "Zapisz status i etykiety" }).click();
  await page.goto("/library");
  await page.getByLabel("Etykieta").selectOption({ label: "mustWatch" });
  await page.getByRole("button", { name: "Zastosuj" }).click();
  await expect(page.getByRole("heading", { name: "Testowy film" })).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Profil publiczny").check();
  await page.getByLabel("Pokazuj statystyki").check();
  await page.getByRole("button", { name: "Zapisz" }).nth(1).click();
  await page.getByLabel("Język interfejsu").selectOption("EN");
  await page.getByRole("button", { name: "Zapisz" }).nth(2).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  const anonymous = await context.browser()!.newContext();
  const publicPage = await anonymous.newPage();
  await publicPage.goto(`/u/${username}`);
  await expect(publicPage.getByText(`@${username}`)).toBeVisible();
  await anonymous.close();
});
