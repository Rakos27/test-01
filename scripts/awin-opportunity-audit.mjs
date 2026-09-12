import { mkdir, writeFile } from "node:fs/promises";

const token = process.env.AWIN_ACCESS_TOKEN?.trim();
const publisherId = process.env.AWIN_PUBLISHER_ID?.trim();
const outputPath = process.env.AWIN_OPPORTUNITY_REPORT?.trim() || "data/awin-opportunity-report.json";

if (!token || !publisherId) {
  console.error("AWIN_ACCESS_TOKEN et AWIN_PUBLISHER_ID sont requis.");
  process.exit(1);
}

const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
};

async function fetchProgrammes(relationship) {
  const url = new URL(`https://api.awin.com/publishers/${publisherId}/programmes`);
  url.searchParams.set("countryCode", "FR");
  url.searchParams.set("relationship", relationship);
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Awin a répondu ${response.status} pour ${relationship}.`);
  }
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function scoreFit(programme) {
  const text = `${programme.name ?? ""} ${programme.primarySector ?? ""} ${programme.description ?? ""}`.toLocaleLowerCase("fr");
  const matches = [
    ["high-tech", /\b(electronic|computer|software|technology|tech|microsoft|security|smart home)\b/],
    ["maison", /\b(home|garden|furniture|lawn|house|maison)\b/],
    ["beauté", /\b(beauty|cosmetic|parfum|health)\b/],
    ["sport", /\b(sport|fitness|outdoor|running)\b/],
    ["animalerie", /\b(pet|animal|pets)\b/],
  ].filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  return {
    score: Math.min(100, 35 + matches.length * 20),
    categories: matches,
  };
}

function scoreEconomics(programme) {
  const text = `${programme.description ?? ""}`;
  const commission = text.match(/(?:up to|jusqu['’à])\s*(\d+(?:[.,]\d+)?)\s*%/i);
  const conversion = Number(programme.conversionRate);
  const epc = Number(programme.epc);
  const hasMetrics = commission || Number.isFinite(conversion) || Number.isFinite(epc);
  const score = hasMetrics
    ? (commission ? 30 : 10) +
      (Number.isFinite(conversion) && conversion > 2 ? 25 : 0) +
      (Number.isFinite(epc) && epc >= 0.2 ? 25 : 0) +
      (programme.productFeed ? 20 : 0)
    : 50;
  return {
    score: Math.min(100, score),
    confidence: hasMetrics ? "partielle" : "faible",
    commission: commission ? `${commission[1].replace(",", ".")}% maximum annoncé` : null,
    conversionRate: Number.isFinite(conversion) ? conversion : null,
    epc: Number.isFinite(epc) ? epc : null,
  };
}

function scoreRisk(programme) {
  const paymentDays = Number(programme.paymentDelay ?? programme.averagePaymentDelay);
  const exposure = String(programme.paymentStatus ?? programme.exposureLevel ?? "").toLowerCase();
  const paymentRisk = Number.isFinite(paymentDays) && paymentDays > 100 ? 35 : 0;
  const exposureRisk = /level 2|niveau 2|high|élevé/.test(exposure) ? 35 : 0;
  return {
    score: Math.max(0, 100 - paymentRisk - exposureRisk),
    paymentDelayDays: Number.isFinite(paymentDays) ? paymentDays : null,
    exposure: exposure || null,
    needsManualTermsReview: paymentRisk > 0 || exposureRisk > 0,
  };
}

function recommendation({ fit, economics, risk, relationship }) {
  const total = Math.round(fit.score * 0.4 + economics.score * 0.35 + risk.score * 0.25);
  if (relationship === "joined") return economics.confidence === "faible" ? "surveiller" : total >= 55 ? "promouvoir" : "surveiller";
  if (risk.needsManualTermsReview) return "revue humaine obligatoire";
  if (total >= 65) return "à accepter après revue humaine";
  if (total >= 45) return "à étudier";
  return "ne pas prioriser";
}

const [joined, pending] = await Promise.all([
  fetchProgrammes("joined"),
  fetchProgrammes("pending"),
]);
const analysed = [...joined.map((p) => ({ ...p, relationship: "joined" })), ...pending.map((p) => ({ ...p, relationship: "pending" }))]
  .map((programme) => {
    const fit = scoreFit(programme);
    const economics = scoreEconomics(programme);
    const risk = scoreRisk(programme);
    return {
      id: programme.id,
      name: programme.name,
      relationship: programme.relationship,
      sector: programme.primarySector ?? null,
      region: programme.primaryRegion?.countryCode ?? null,
      productFeed: programme.productFeed ?? null,
      fit,
      economics,
      risk,
      recommendation: recommendation({ fit, economics, risk, relationship: programme.relationship }),
      manualActions: programme.relationship === "pending"
        ? ["Lire les conditions du programme", "Vérifier commission, cookie et paiements", "Accepter ou refuser manuellement dans Awin"]
        : ["Synchroniser les promotions", "Contrôler les offres et les expirations"],
    };
  });

const report = {
  generatedAt: new Date().toISOString(),
  publisherId,
  policy: "Analyse automatique, aucune acceptation ou demande automatique.",
  programmes: analysed,
};

await mkdir(new URL(".", `file://${process.cwd()}/${outputPath}`).pathname, { recursive: true }).catch(() => {});
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, programmes: analysed.length, pending: pending.length, joined: joined.length }, null, 2));