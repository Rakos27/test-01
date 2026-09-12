import { chromium } from "playwright";

const baseURL =
  process.env.DEALYVA_URL ??
  process.env.OFFRELY_URL ??
  "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
  locale: "fr-FR",
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);
const consoleErrors = [];
const fixtureGeneratedAt = new Date().toISOString();
const fixturePromotions = [
  {
    id: "awin-qa-001",
    brandId: "awin-101-dealyva-tech",
    brand: "Dealyva Tech",
    merchant: "Dealyva Tech",
    category: "high-tech",
    title: "Offre partenaire de contrôle qualité",
    description:
      "Promotion utilisée uniquement par les tests automatisés de Dealyva.",
    originalPrice: 129,
    currentPrice: 89,
    discount: 31,
    savings: 40,
    image:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='650'%3E%3Crect width='900' height='650' fill='%23e9e9e5'/%3E%3C/svg%3E",
    expiresAt: "2027-12-31T23:59:59.000Z",
    verifiedAt: fixtureGeneratedAt,
    createdAt: fixtureGeneratedAt,
    promoCode: "QUALITE",
    isNew: true,
    isExpired: false,
    onlineOnly: true,
    terms: [
      "Offre de test non publiée.",
      "Conditions vérifiées par le scénario automatisé.",
    ],
    tags: ["awin", "code-promo", "high-tech"],
    source: "awin",
    sourceId: "qa-001",
    affiliateUrl: "https://example.com/qa-001",
    offerType: "voucher",
  },
  {
    id: "awin-qa-002",
    brandId: "awin-102-dealyva-maison",
    brand: "Dealyva Maison",
    merchant: "Dealyva Maison",
    category: "maison",
    title: "Seconde offre de contrôle",
    description: "Une seconde promotion pour vérifier les listes et filtres.",
    originalPrice: 79,
    currentPrice: 59,
    discount: 25,
    savings: 20,
    image:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='650'%3E%3Crect width='900' height='650' fill='%23deded9'/%3E%3C/svg%3E",
    expiresAt: "2027-11-30T23:59:59.000Z",
    verifiedAt: fixtureGeneratedAt,
    createdAt: fixtureGeneratedAt,
    isNew: false,
    isExpired: false,
    onlineOnly: true,
    terms: ["Offre de test non publiée."],
    tags: ["awin", "promotion", "maison"],
    source: "awin",
    sourceId: "qa-002",
    affiliateUrl: "https://example.com/qa-002",
    offerType: "promotion",
  },
];

await page.route("**/data/promotions.json", async (route) => {
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      generatedAt: fixtureGeneratedAt,
      promotions: fixturePromotions,
    }),
  });
});

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

async function assertNoDocumentOverflow(label, targetPage = page) {
  const dimensions = await targetPage.evaluate(() => {
    const viewport = window.innerWidth;
    const overflowingElements = [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${[...element.classList].join(".")}` : ""}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(
        (element) =>
          element.width > 0 &&
          (element.left < -1 || element.right > viewport + 1),
      )
      .slice(0, 8);

    return {
      viewport,
      document: document.documentElement.scrollWidth,
      overflowingElements,
    };
  });
  if (dimensions.document > dimensions.viewport + 1) {
    throw new Error(
      `${label} déborde horizontalement (${dimensions.document}px pour ${dimensions.viewport}px).\n${JSON.stringify(dimensions.overflowingElements, null, 2)}`,
    );
  }
}

async function revealMotionOnPage() {
  await page.evaluate(async () => {
    const step = Math.max(320, Math.round(window.innerHeight * 0.7));
    for (let position = 0; position < document.body.scrollHeight; position += step) {
      window.scrollTo({ top: position, behavior: "instant" });
      await new Promise((resolve) => window.setTimeout(resolve, 35));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    document
      .querySelectorAll(".motion-reveal")
      .forEach((element) => element.classList.add("is-motion-visible"));
  });
  await page.waitForTimeout(900);
}

try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Les meilleurs deals/i }).waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector(".promotion-card:not(.skeleton-card)") !== null ||
      document.querySelector(".live-catalog-empty") !== null,
  );
  await page.waitForFunction(
    () => document.querySelector(".motion-reveal.is-motion-visible") !== null,
  );

  const promotionCount = await page
    .locator(".promotion-card:not(.skeleton-card)")
    .count();
  await assertNoDocumentOverflow("Accueil desktop");
  await page.getByRole("button", { name: /Activer le mode sombre/i }).click();
  await page.locator("html[data-theme='dark']").waitFor();
  await page.getByRole("button", { name: /Activer le mode clair/i }).click();
  await revealMotionOnPage();
  await page.screenshot({
    path: "/tmp/dealyva-home-desktop.png",
    fullPage: true,
  });

  const screenshots = ["/tmp/dealyva-home-desktop.png"];

  if (promotionCount > 0) {
    const favoriteButton = page
      .locator(".promotion-card")
      .first()
      .getByRole("button", { name: /Ajouter aux favoris/i });
    await favoriteButton.click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".card-icon-button.is-active")
          ?.classList.contains("is-celebrating") === true,
    );
    await page.getByRole("link", { name: /Mes favoris/i }).first().click();
    await page.getByRole("heading", { name: "Mes favoris", exact: true }).waitFor();
    await page.locator(".favorite-item").first().waitFor();

    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder(/Une marque, un produit/i).fill(
      "recherche volontairement introuvable 9284",
    );
    await page
      .getByRole("heading", { name: /Cette sélection est un peu trop précise/i })
      .waitFor();
    await page.getByRole("button", { name: /Réinitialiser les filtres/i }).click();
    await page.locator(".promotion-card:not(.skeleton-card)").first().waitFor();

    await page.locator(".promotion-card__title").first().click();
    await page.getByRole("heading", { name: /Conditions de l’offre/i }).waitFor();
    await page
      .getByRole("heading", { name: /Ce que nous avons pu vérifier/i })
      .waitFor();
    const promoCodeButton = page.locator(".promo-code").first();
    if ((await promoCodeButton.count()) > 0) {
      await promoCodeButton.click();
      await page.locator(".promo-code.is-copied").waitFor();
    }
    await assertNoDocumentOverflow("Détail desktop");
    await revealMotionOnPage();
    await page.screenshot({
      path: "/tmp/dealyva-detail-desktop.png",
      fullPage: true,
    });
    screenshots.push("/tmp/dealyva-detail-desktop.png");
  }

  for (const [route, heading] of [
    ["/marques", /Vos marques, vos réductions/i],
    ["/categories", /Une envie, une catégorie/i],
    ["/favoris", /Mes favoris/i],
    ["/compte", /Créez votre profil local/i],
    ["/a-propos", /Les offres utiles, sans le bruit/i],
    ["/comment-ca-marche", /Comment fonctionne Dealyva/i],
    ["/faq", /Questions fréquentes/i],
    ["/mentions-legales", /Mentions légales/i],
    ["/conditions-utilisation", /Conditions générales d’utilisation/i],
    ["/confidentialite", /Politique de confidentialité/i],
    ["/cookies", /Politique relative aux cookies/i],
    ["/marque/awin-101-dealyva-tech", /Promotions Dealyva Tech/i],
  ]) {
    await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: heading }).first().waitFor();
    await assertNoDocumentOverflow(route);
  }

  await page.goto(`${baseURL}/marque/awin-101-dealyva-tech`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: /Promotions Dealyva Tech/i }).waitFor();
  await revealMotionOnPage();
  await page.screenshot({
    path: "/tmp/dealyva-brand-desktop.png",
    fullPage: true,
  });
  screenshots.push("/tmp/dealyva-brand-desktop.png");

  await page.goto(`${baseURL}/categories`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /Explorer high-tech/i }).click();
  await page
    .getByRole("checkbox", { name: "High-tech", exact: true })
    .waitFor();
  if (
    !(await page
      .getByRole("checkbox", { name: "High-tech", exact: true })
      .isChecked())
  ) {
    throw new Error("Le lien de catégorie n’applique pas son filtre.");
  }

  await page.goto(`${baseURL}/compte`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/Prénom ou pseudo/i).fill("Camille");
  await page.getByLabel(/Adresse e-mail/i).fill("camille@example.test");
  await page.getByRole("button", { name: /Créer mon profil local/i }).click();
  await page.getByRole("heading", { name: /Bonjour Camille/i }).waitFor();

  await page.setViewportSize({ width: 1440, height: 650 });
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator(".promotion-card:not(.skeleton-card)").first().waitFor();
  await page.locator("#promotions").scrollIntoViewIfNeeded();
  const filterPanel = page.locator(".filter-panel");
  const filterScrollState = await filterPanel.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  if (filterScrollState.scrollHeight <= filterScrollState.clientHeight) {
    throw new Error("Le panneau de filtres ne possède pas son propre défilement.");
  }
  const pageScrollBefore = await page.evaluate(() => window.scrollY);
  await filterPanel.hover();
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(150);
  const filterScrollTop = await filterPanel.evaluate((element) => element.scrollTop);
  const pageScrollAfter = await page.evaluate(() => window.scrollY);
  if (filterScrollTop <= 0 || Math.abs(pageScrollAfter - pageScrollBefore) > 2) {
    throw new Error("Le défilement des filtres entraîne encore la page principale.");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document.querySelector(".promotion-card:not(.skeleton-card)") !== null ||
      document.querySelector(".live-catalog-empty") !== null,
  );
  await assertNoDocumentOverflow("Accueil mobile");
  await page.getByRole("button", { name: /Ouvrir le menu/i }).click();
  await page.getByRole("navigation", { name: /Navigation mobile/i }).waitFor();
  await revealMotionOnPage();
  await page.screenshot({
    path: "/tmp/dealyva-home-mobile.png",
    fullPage: true,
  });
  screenshots.push("/tmp/dealyva-home-mobile.png");

  await page.goto(`${baseURL}/marque/awin-101-dealyva-tech`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: /Promotions Dealyva Tech/i }).waitFor();
  await assertNoDocumentOverflow("Marque mobile");
  await revealMotionOnPage();
  await page.screenshot({
    path: "/tmp/dealyva-brand-mobile.png",
    fullPage: true,
  });
  screenshots.push("/tmp/dealyva-brand-mobile.png");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Les meilleurs deals/i }).waitFor();
  const motionEnabledWithReducedMotion = await page.evaluate(() =>
    document.documentElement.classList.contains("motion-enabled"),
  );
  if (motionEnabledWithReducedMotion) {
    throw new Error(
      "Les animations restent actives malgré la préférence de réduction des mouvements.",
    );
  }

  const demoPage = await context.newPage();
  demoPage.setDefaultTimeout(15_000);
  demoPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  demoPage.on("pageerror", (error) => consoleErrors.push(error.message));
  await demoPage.goto(baseURL, { waitUntil: "domcontentloaded" });
  await demoPage.evaluate(() => window.localStorage.clear());
  await demoPage.reload({ waitUntil: "domcontentloaded" });
  await demoPage
    .getByRole("heading", { name: /Mode démonstration actif/i })
    .waitFor();
  const demoCards = demoPage.locator(
    ".promotions-section .promotion-grid > .promotion-card--demo",
  );
  if ((await demoCards.count()) !== 12) {
    throw new Error(
      `Le catalogue fictif devrait afficher 12 cartes, mais ${await demoCards.count()} sont présentes.`,
    );
  }
  await demoPage.goto(`${baseURL}/offre/demo-atelier-minuit-25`, {
    waitUntil: "domcontentloaded",
  });
  await demoPage
    .getByText("Démonstration fictive", { exact: true })
    .waitFor();
  await demoPage
    .getByRole("heading", { name: /Guide des tailles/i })
    .waitFor();
  await demoPage
    .getByRole("button", { name: /S, en promotion/i })
    .click();
  await demoPage
    .getByText(/Taille S sélectionnée/i)
    .waitFor();
  await demoPage
    .getByRole("button", { name: /Tester le bouton/i })
    .click();
  await demoPage
    .getByText(/aucun achat réel n’est effectué/i)
    .waitFor();
  await assertNoDocumentOverflow("Détail démonstration", demoPage);
  await demoPage.setViewportSize({ width: 390, height: 844 });
  await demoPage.reload({ waitUntil: "domcontentloaded" });
  await demoPage
    .getByRole("heading", { name: /Guide des tailles/i })
    .waitFor();
  await assertNoDocumentOverflow("Détail démonstration mobile", demoPage);
  await demoPage.goto(`${baseURL}/compte`, { waitUntil: "domcontentloaded" });
  await demoPage
    .getByRole("heading", { name: /Créez votre profil local/i })
    .waitFor();
  await assertNoDocumentOverflow("Compte mobile", demoPage);
  await demoPage.close();

  const uniqueErrors = [...new Set(consoleErrors)].filter(
    (message) =>
      !message.includes("Failed to load resource") &&
      !message.includes("ERR_NAME_NOT_RESOLVED"),
  );
  if (uniqueErrors.length) {
    throw new Error(`Erreurs navigateur :\n${uniqueErrors.join("\n")}`);
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        promotionCardsOnFirstLoad: promotionCount,
        demoPromotionCards: 12,
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
