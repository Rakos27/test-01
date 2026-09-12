import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.env.DEALYVA_URL ?? "http://127.0.0.1:5173";
const demoFeed = JSON.parse(
  await readFile(new URL("../public/data/demo-promotions.json", import.meta.url)),
);
const promotions = demoFeed.promotions;
const brandIds = [...new Set(promotions.map((promotion) => promotion.brandId))];
const categories = [
  "mode",
  "sport",
  "beaute",
  "high-tech",
  "gaming",
  "maison",
  "alimentation",
  "voyage",
];
const categoryLabels = {
  mode: "Mode",
  sport: "Sport",
  beaute: "Beauté",
  "high-tech": "High-tech",
  gaming: "Gaming",
  maison: "Maison",
  alimentation: "Alimentation",
  voyage: "Voyage",
};
const staticRoutes = [
  "/",
  "/marques",
  "/categories",
  "/favoris",
  "/compte",
  "/a-propos",
  "/comment-ca-marche",
  "/faq",
  "/mentions-legales",
  "/conditions-utilisation",
  "/confidentialite",
  "/cookies",
];
const dynamicRoutes = [
  ...promotions.map((promotion) => `/offre/${promotion.id}`),
  ...brandIds.map((brandId) => `/marque/${brandId}`),
  ...categories.map((category) => `/?categorie=${category}`),
];

const browser = await chromium.launch({ headless: true });
const errors = [];
const warnings = [];
const auditedRoutes = new Set();
const auditedLinks = new Set();
const linkSources = new Map();
const externalLinks = new Set();
const screenshots = [];

function routeUrl(route) {
  const base = baseURL.replace(/\/+$/, "");
  return `${base}${route}`;
}

function listen(page, label) {
  page.on("pageerror", (error) => {
    errors.push(`${label}: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (
        !text.includes("Failed to load resource") &&
        !text.includes("ERR_NAME_NOT_RESOLVED")
      ) {
        errors.push(`${label}: console: ${text}`);
      }
    }
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? "erreur inconnue";
    // React StrictMode intentionally mounts, cleans up, then remounts effects in
    // development. The feed's AbortController therefore cancels the first
    // request before the second one succeeds. A cancellation is not a network
    // failure; every usable-page assertion below waits for the successful feed.
    if (url.startsWith(baseURL) && !failure.includes("ERR_ABORTED")) {
      errors.push(
        `${label}: requête interne échouée ${url} (${failure})`,
      );
    }
  });
}

async function assertUsablePage(page, route, viewportLabel) {
  await page.waitForFunction(
    () => {
      const h1 = document.querySelector("main h1");
      return (
        Boolean(h1) &&
        Number(getComputedStyle(h1).opacity) > 0.5 &&
        (document.querySelector("main")?.textContent?.trim().length ?? 0) > 20
      );
    },
    null,
    { timeout: 20_000 },
  );

  const audit = await page.evaluate(() => {
    const main = document.querySelector("main");
    const h1 = main?.querySelector("h1");
    const ids = [...document.querySelectorAll("[id]")]
      .map((element) => element.id)
      .filter(Boolean);
    const duplicateIds = ids.filter(
      (id, index) => ids.indexOf(id) !== index,
    );
    const viewportWidth = document.documentElement.clientWidth;
    const brokenImages = [...document.images]
      .filter((image) => image.complete && image.currentSrc && image.naturalWidth === 0)
      .map((image) => image.currentSrc);
    const unnamedControls = [
      ...document.querySelectorAll("button, a[href], input, select, textarea"),
    ]
      .filter((element) => {
        if (
          element instanceof HTMLInputElement &&
          element.type === "hidden"
        ) {
          return false;
        }
        const labelledBy = element.getAttribute("aria-labelledby");
        const label = labelledBy
          ? labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? "")
              .join(" ")
          : "";
        const associatedLabel =
          "labels" in element && element.labels
            ? [...element.labels].map((item) => item.textContent ?? "").join(" ")
            : "";
        return ![
          element.getAttribute("aria-label"),
          element.getAttribute("title"),
          element.textContent,
          associatedLabel,
          label,
        ].some((value) => value?.trim());
      })
      .map((element) => element.outerHTML.slice(0, 180));
    const overflowing = [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          label: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${[...element.classList].join(".")}` : ""}`,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      })
      .filter(
        ({ element, left, right, width }) =>
          width > 0 &&
          getComputedStyle(element).position !== "fixed" &&
          (left < -2 || right > viewportWidth + 2),
      )
      .slice(0, 8)
      .map(({ label, left, right, width }) => ({
        label,
        left: Math.round(left),
        right: Math.round(right),
        width: Math.round(width),
      }));
    const mainStyle = main ? getComputedStyle(main) : null;

    return {
      rootTextLength: document.body.innerText.trim().length,
      mainTextLength: main?.textContent?.trim().length ?? 0,
      h1: h1?.textContent?.trim() ?? "",
      h1Count: document.querySelectorAll("main h1").length,
      mainCount: document.querySelectorAll("main").length,
      duplicateIds: [...new Set(duplicateIds)],
      mainVisible:
        Boolean(main) &&
        mainStyle?.display !== "none" &&
        mainStyle?.visibility !== "hidden" &&
        Number(mainStyle?.opacity ?? 1) > 0 &&
        (main?.getBoundingClientRect().height ?? 0) > 20,
      isNotFound: Boolean(main?.querySelector(".error-code")),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth,
      brokenImages,
      unnamedControls,
      overflowing,
    };
  });

  if (!audit.mainVisible || audit.mainTextLength < 20 || !audit.h1) {
    throw new Error(
      `${viewportLabel} ${route}: page vide ou contenu principal invisible (${JSON.stringify(audit)})`,
    );
  }
  if (audit.mainCount !== 1 || audit.h1Count !== 1) {
    throw new Error(
      `${viewportLabel} ${route}: structure principale ambiguë (${audit.mainCount} main, ${audit.h1Count} h1)`,
    );
  }
  if (audit.duplicateIds.length) {
    throw new Error(
      `${viewportLabel} ${route}: identifiants HTML dupliqués ${audit.duplicateIds.join(", ")}`,
    );
  }
  if (audit.isNotFound) {
    throw new Error(`${viewportLabel} ${route}: redirection vers une 404`);
  }
  if (audit.documentWidth > audit.viewportWidth + 2) {
    throw new Error(
      `${viewportLabel} ${route}: débordement horizontal ${audit.documentWidth}/${audit.viewportWidth} ${JSON.stringify(audit.overflowing)}`,
    );
  }
  if (audit.brokenImages.length) {
    warnings.push(
      `${viewportLabel} ${route}: images cassées ${audit.brokenImages.join(", ")}`,
    );
  }
  if (audit.unnamedControls.length) {
    errors.push(
      `${viewportLabel} ${route}: contrôles sans nom accessible ${audit.unnamedControls.join(" | ")}`,
    );
  }

  auditedRoutes.add(`${viewportLabel}:${route}`);
}

async function collectLinks(page, route) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")).filter(Boolean),
  );
  hrefs.forEach((href) => {
    if (href.startsWith("/")) {
      auditedLinks.add(href);
      if (!linkSources.has(href)) {
        linkSources.set(href, route);
      }
    } else if (/^https?:\/\//.test(href)) {
      externalLinks.add(href);
    }
  });
}

async function auditRoutes(page, routes, viewportLabel) {
  for (const route of routes) {
    process.stdout.write(`Audit ${viewportLabel} ${route}\n`);
    await page.goto(routeUrl(route), { waitUntil: "domcontentloaded" });
    try {
      await assertUsablePage(page, route, viewportLabel);
    } catch (error) {
      throw new Error(
        `${viewportLabel} ${route}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await collectLinks(page, route);
  }
}

async function auditInternalLinkClicks(page) {
  for (const [href, sourceRoute] of linkSources) {
    await page.goto(routeUrl(sourceRoute), { waitUntil: "domcontentloaded" });
    await page.locator("main h1").waitFor();
    const link = page.locator(`a[href=${JSON.stringify(href)}]`).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();

    const expected = new URL(href, baseURL);
    await page.waitForURL(
      (url) =>
        url.pathname === expected.pathname && url.search === expected.search,
    );
    await assertUsablePage(page, href, "desktop-click");
  }
}

async function auditExternalLinks() {
  for (const href of externalLinks) {
    const response = await fetch(href, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Lien externe indisponible (${response.status}) : ${href}`);
    }
  }
}

async function auditFallbackRoutes(page) {
  const fallbacks = [
    ["/page-qui-nexiste-pas", /Cette page s’est égarée/i, /Retourner à l’accueil/i],
    ["/offre/offre-inconnue", /Cette promotion n’existe plus/i, /Revenir aux promotions/i],
    [
      "/marque/marque-inconnue",
      /Cette marque n’est pas dans le catalogue/i,
      /Voir toutes les marques/i,
    ],
  ];

  for (const [route, heading, action] of fallbacks) {
    await page.goto(routeUrl(route), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: heading }).waitFor();
    await page.getByRole("link", { name: action }).click();
    await page.locator("main h1").waitFor();
  }
}

async function auditHomeInteractions(page) {
  await page.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Mode démonstration actif/i }).waitFor();

  const search = page.getByPlaceholder(/Une marque, un produit/i);
  await search.fill("chaussures");
  await page
    .getByRole("heading", { name: /Les offres qui valent le détour/i })
    .waitFor();
  if ((await page.locator(".promotions-section .promotion-card").count()) < 1) {
    throw new Error("La recherche d’une offre existante ne renvoie aucun résultat.");
  }
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await page.waitForFunction(() => window.scrollY > 100);
  await search.fill("résultat volontairement introuvable");
  await page
    .getByRole("heading", { name: /Cette sélection est un peu trop précise/i })
    .waitFor();
  await page.getByRole("button", { name: /Réinitialiser les filtres/i }).click();

  await page.getByRole("checkbox", { name: "Mode", exact: true }).check();
  if ((await page.locator(".promotions-section .promotion-card").count()) < 1) {
    throw new Error("Le filtre Mode masque toutes les offres de mode.");
  }
  await page.getByRole("checkbox", { name: "Mode", exact: true }).uncheck();

  await page.getByLabel("Minimum").fill("20");
  await page.getByLabel("Maximum").fill("100");
  await page.getByRole("button", { name: "−20%" }).click();
  await page.getByRole("radio", { name: "Avec code" }).check();
  await page.getByRole("switch", { name: /Nouveautés/i }).check();
  await page.getByRole("switch", { name: /Nouveautés/i }).uncheck();
  await page.getByRole("radio", { name: "Toutes les offres" }).check();
  await page.getByRole("button", { name: /Réinitialiser/i }).first().click();

  await page.getByRole("button", { name: /Actualiser les offres/i }).click();
  await page
    .getByText(/Catalogue de démonstration actualisé/i)
    .waitFor();

  const sort = page.locator(".sort-select select");
  for (const value of [
    "recent",
    "discount",
    "price-asc",
    "price-desc",
    "ending",
    "recommended",
  ]) {
    await sort.selectOption(value);
  }

  const firstCard = page.locator(".promotions-section .promotion-card").first();
  await firstCard.getByRole("button", { name: /Partager cette offre/i }).click();
  await page.getByText(/Lien de l’offre copié/i).waitFor();
  const cardCode = firstCard.locator(".promo-code");
  if ((await cardCode.count()) > 0) {
    await cardCode.click();
    await cardCode.getByText("Copié", { exact: true }).waitFor();
  }
  await firstCard.getByRole("button", { name: /Ajouter aux favoris/i }).click();
  await page.getByText(/Offre ajoutée aux favoris/i).waitFor();
  await page.getByRole("link", { name: /Mes favoris/i }).first().click();
  await page.getByRole("heading", { name: "Mes favoris", exact: true }).waitFor();
  if ((await page.locator(".favorite-item").count()) !== 1) {
    throw new Error("Le favori ajouté n’apparaît pas dans la page des favoris.");
  }
  await page.getByRole("button", { name: /Retirer .* des favoris/i }).click();
  await page
    .getByRole("heading", { name: /Gardez vos plus belles trouvailles/i })
    .waitFor();
}

async function auditThemeAndBrandSelector(page) {
  await page.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Mode démonstration actif/i }).waitFor();
  const themeButton = page.getByRole("button", { name: /Activer le mode sombre/i });
  await themeButton.click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.getByRole("button", { name: /Activer le mode clair/i }).click();

  const recommendations = page.locator(".recommendation-item");
  const recommendationCount = await recommendations.count();
  if (recommendationCount > 0) {
    const dismissedHref = await recommendations
      .first()
      .locator('a[href^="/offre/"]')
      .first()
      .getAttribute("href");
    await recommendations
      .first()
      .getByRole("button", { name: /Cela ne m’intéresse pas/i })
      .click();
    if (dismissedHref) {
      await page
        .locator(
          `.recommendations-section a[href=${JSON.stringify(dismissedHref)}]`,
        )
        .waitFor({ state: "detached" });
    }
  }

  await page.getByRole("button", { name: /Choisir mes marques/i }).click();
  const dialog = page.getByRole("dialog", { name: /Sélectionner des marques/i });
  await dialog.waitFor();
  await dialog.getByPlaceholder(/Rechercher parmi les marques/i).fill("Atelier");
  const atelierOption = dialog
    .locator(".brand-option")
    .filter({ hasText: "Atelier Minuit" });
  await atelierOption.click();
  if (!(await atelierOption.getByRole("checkbox").isChecked())) {
    throw new Error("Une ligne de marque cliquée ne sélectionne pas la marque.");
  }
  await dialog.getByRole("switch", {
    name: /Afficher uniquement mes marques/i,
  }).check();
  await dialog.getByRole("button", { name: /Voir ma sélection/i }).click();
  if ((await page.locator(".promotions-section .promotion-card").count()) < 1) {
    throw new Error("La sélection de marques masque toutes les offres choisies.");
  }
}

async function auditCategoryAndBrandInteractions(page) {
  await page.goto(routeUrl("/categories"), { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: /Une envie, une catégorie/i })
    .waitFor();
  for (const category of categories) {
    const link = page.locator(`a[href="/?categorie=${category}"]`).first();
    if ((await link.count()) !== 1) {
      throw new Error(`Lien de catégorie absent : ${category}`);
    }
    await link.click();
    const checkbox = page.getByRole("checkbox", {
      name: categoryLabels[category],
      exact: true,
    });
    await checkbox.waitFor();
    if (!(await checkbox.isChecked())) {
      throw new Error(`Le lien ${category} n’active pas son filtre.`);
    }
    await page.goto(routeUrl("/categories"), { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { name: /Une envie, une catégorie/i })
      .waitFor();
  }

  await page.goto(routeUrl("/marques"), { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Vos marques, vos réductions/i }).waitFor();
  const brandSearch = page.getByPlaceholder(/Rechercher une marque/i);
  await brandSearch.fill("Atelier");
  if ((await page.locator(".brand-catalog-card").count()) !== 1) {
    throw new Error("La recherche de marque ne filtre pas correctement.");
  }
  await brandSearch.fill("");
  await page.getByRole("button", { name: /Tout sélectionner/i }).click();
  await page
    .getByRole("heading", { name: new RegExp(`${brandIds.length} marques suivies`) })
    .waitFor();
  await page.getByRole("button", { name: /Tout effacer/i }).click();
}

async function auditAccount(page) {
  await page.goto(routeUrl("/compte"), { waitUntil: "domcontentloaded" });
  await page.getByLabel(/Prénom ou pseudo/i).fill("Camille");
  await page.getByLabel(/Adresse e-mail/i).fill("camille@example.test");
  await page.getByRole("button", { name: /Créer mon profil local/i }).click();
  await page.getByRole("heading", { name: /Bonjour Camille/i }).waitFor();

  const brandButtons = page.locator(".preference-brands button");
  for (let index = 0; index < (await brandButtons.count()); index += 1) {
    await brandButtons.nth(index).click();
  }
  await page
    .getByText(new RegExp(`${brandIds.length} marques suivies`))
    .waitFor();
  await page.getByRole("button", { name: /Supprimer ce profil/i }).click();
  await page.getByRole("heading", { name: /Créez votre profil local/i }).waitFor();
}

async function auditOfferInteractions(page) {
  for (const [index, promotion] of promotions.entries()) {
    const route = `/offre/${promotion.id}`;
    await page.goto(routeUrl(route), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: promotion.title, exact: true }).waitFor();

    if (promotion.promoCode) {
      await page.getByRole("button", { name: /Copier/i }).click();
      await page.getByRole("button", { name: /Copié/i }).waitFor();
    }

    if (promotion.sizeOptions?.length) {
      const discounted = promotion.sizeOptions.find(
        (size) => size.status === "discounted",
      );
      const unavailable = promotion.sizeOptions.find(
        (size) => size.status === "unavailable",
      );
      if (discounted) {
        await page
          .getByRole("button", {
            name: new RegExp(`^${discounted.label}, en promotion$`),
          })
          .click();
        await page
          .getByText(new RegExp(`Taille ${discounted.label} sélectionnée`))
          .waitFor();
      }
      if (unavailable) {
        const unavailableButton = page.getByRole("button", {
          name: new RegExp(`^${unavailable.label}, indisponible$`),
        });
        if (!(await unavailableButton.isDisabled())) {
          throw new Error(`${route}: une taille épuisée reste sélectionnable.`);
        }
      }
    }

    await page.getByRole("button", { name: /Tester le bouton/i }).click();
    await page.getByText(/aucun achat réel n’est effectué/i).waitFor();

    await page.getByRole("button", { name: /Sauvegarder/i }).click();
    await page.getByRole("button", { name: /Sauvegardée/i }).waitFor();

    if (index === 0) {
      await page.getByRole("button", { name: /Partager l’offre/i }).click();
      await page.getByText(/Lien copié dans le presse-papiers/i).waitFor();
    }
  }

  const directRoute = `/offre/${promotions[0].id}`;
  await page.goto(routeUrl(directRoute), { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: promotions[0].title, exact: true }).waitFor();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByRole("heading", { name: /Les meilleurs deals/i }).waitFor();
}

async function auditIndependentFilterScroll(page) {
  await page.setViewportSize({ width: 1440, height: 650 });
  await page.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await page.locator("#promotions").scrollIntoViewIfNeeded();
  const panel = page.locator(".filter-panel");
  const dimensions = await panel.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  if (dimensions.scrollHeight <= dimensions.clientHeight) {
    throw new Error("Le panneau de filtres n’a pas de défilement autonome.");
  }
  const before = await page.evaluate(() => window.scrollY);
  await panel.hover();
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(120);
  const panelTop = await panel.evaluate((element) => element.scrollTop);
  const after = await page.evaluate(() => window.scrollY);
  if (panelTop <= 0 || Math.abs(after - before) > 2) {
    throw new Error("Le défilement des filtres déplace encore la page.");
  }
}

async function auditMobileMenu(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Ouvrir le menu/i }).click();
  const nav = page.getByRole("navigation", { name: /Navigation mobile/i });
  await nav.waitFor();
  for (const label of [
    "Promotions",
    "Marques",
    "Catégories",
    "Mes favoris",
    "Comment ça marche",
    "À propos",
    "FAQ",
  ]) {
    if ((await nav.getByRole("link", { name: label, exact: true }).count()) !== 1) {
      throw new Error(`Lien mobile absent : ${label}`);
    }
  }
  await page.getByRole("button", { name: /Fermer le menu/i }).click();

  for (const label of ["Marques", "Catégories", "Mes favoris", "À propos", "FAQ"]) {
    await page.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Ouvrir le menu/i }).click();
    const mobileNav = page.getByRole("navigation", { name: /Navigation mobile/i });
    await mobileNav.getByRole("link", { name: label, exact: true }).click();
    await page.locator("main h1").waitFor();
    if (await mobileNav.isVisible().catch(() => false)) {
      throw new Error(`Le menu mobile reste ouvert après le clic sur ${label}.`);
    }
  }

  await page.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Mode démonstration actif/i }).waitFor();
  await page.getByRole("button", { name: /^Filtres/ }).click();
  const filters = page.getByRole("complementary", {
    name: /Filtres des promotions/i,
  });
  await filters.waitFor();
  await filters.getByRole("checkbox", { name: "Mode", exact: true }).check();
  await filters.getByRole("button", { name: /Appliquer les filtres/i }).click();
  await filters.waitFor({ state: "hidden" });
}

async function revealPageForScreenshot(page) {
  await page.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Mode démonstration actif/i }).waitFor();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < height; y += Math.max(400, viewportHeight * 0.75)) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(700);
}

async function auditResponsiveBreakpoints(page) {
  const representativeRoutes = [
    "/",
    "/marques",
    "/categories",
    "/compte",
    "/mentions-legales",
    `/offre/${promotions[0].id}`,
    `/marque/${brandIds[0]}`,
  ];

  for (const viewport of [
    { label: "compact-320", width: 320, height: 700 },
    { label: "tablet-768", width: 768, height: 900 },
  ]) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await auditRoutes(page, representativeRoutes, viewport.label);
  }
}

try {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "fr-FR",
    colorScheme: "light",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const desktop = await desktopContext.newPage();
  listen(desktop, "desktop");
  desktop.setDefaultTimeout(20_000);
  await desktop.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await desktop.evaluate(() => localStorage.clear());

  await auditRoutes(
    desktop,
    [...staticRoutes, ...dynamicRoutes],
    "desktop",
  );
  await auditInternalLinkClicks(desktop);
  await auditExternalLinks();
  await auditFallbackRoutes(desktop);
  await auditHomeInteractions(desktop);
  await auditThemeAndBrandSelector(desktop);
  await auditCategoryAndBrandInteractions(desktop);
  await auditAccount(desktop);
  await auditOfferInteractions(desktop);
  await auditIndependentFilterScroll(desktop);
  await desktop.setViewportSize({ width: 1440, height: 1000 });
  await revealPageForScreenshot(desktop);
  await desktop.screenshot({
    path: "/tmp/dealyva-audit-desktop.png",
    fullPage: true,
  });
  screenshots.push("/tmp/dealyva-audit-desktop.png");
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
    colorScheme: "light",
  });
  const mobile = await mobileContext.newPage();
  listen(mobile, "mobile");
  mobile.setDefaultTimeout(20_000);
  await mobile.goto(routeUrl("/"), { waitUntil: "domcontentloaded" });
  await mobile.evaluate(() => localStorage.clear());
  await auditRoutes(
    mobile,
    [...staticRoutes, ...dynamicRoutes],
    "mobile",
  );
  await auditMobileMenu(mobile);
  await revealPageForScreenshot(mobile);
  await mobile.screenshot({
    path: "/tmp/dealyva-audit-mobile.png",
    fullPage: true,
  });
  screenshots.push("/tmp/dealyva-audit-mobile.png");
  await auditResponsiveBreakpoints(mobile);
  await mobileContext.close();

  if (errors.length) {
    throw new Error(`Audit en échec :\n${[...new Set(errors)].join("\n")}`);
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        routesAudited: auditedRoutes.size,
        internalLinksFound: auditedLinks.size,
        internalLinksClicked: linkSources.size,
        externalLinksChecked: externalLinks.size,
        offersExercised: promotions.length,
        brandsAudited: brandIds.length,
        categoriesAudited: categories.length,
        warnings: [...new Set(warnings)],
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
