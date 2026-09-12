import {
  DEFAULT_CANDIDATES_PATH,
  DEFAULT_MODERATION_PATH,
  DEFAULT_PUBLIC_FEED_PATH,
  publishApprovedOffers,
  writeJsonAtomic,
} from "./lib/awin-moderation.mjs";

const API_BASE_URL = "https://api.awin.com";
const PAGE_SIZE = 200;
const productFeedUrl = process.env.AWIN_PRODUCT_FEED_URL?.trim();

const token = process.env.AWIN_ACCESS_TOKEN?.trim();
const publisherId = process.env.AWIN_PUBLISHER_ID?.trim();
const membership = process.env.AWIN_MEMBERSHIP?.trim() || "joined";
const candidatesPath =
  process.env.AWIN_CANDIDATES_PATH?.trim() || DEFAULT_CANDIDATES_PATH;
const moderationPath =
  process.env.AWIN_MODERATION_PATH?.trim() || DEFAULT_MODERATION_PATH;
const outputPath =
  process.env.AWIN_OUTPUT_PATH?.trim() || DEFAULT_PUBLIC_FEED_PATH;

if (!token || !publisherId) {
  console.error(
    "AWIN_ACCESS_TOKEN et AWIN_PUBLISHER_ID sont requis pour synchroniser les offres.",
  );
  process.exit(1);
}

if (!["joined", "all"].includes(membership)) {
  console.error("AWIN_MEMBERSHIP doit valoir joined ou all.");
  process.exit(1);
}

const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
};

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
}

function parseCsv(value) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

function normalizeProductFeed(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

async function fetchProductFeed() {
  if (!productFeedUrl) return [];
  const response = await fetch(productFeedUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Flux produit Awin indisponible (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = productFeedUrl.endsWith(".gz")
    ? (await import("node:zlib")).gunzipSync(buffer).toString("utf8")
    : buffer.toString("utf8");
  return normalizeProductFeed(parseCsv(text));
}

function productTokens(value) {
  return String(value ?? "")
    .toLocaleLowerCase("fr")
    .match(/[a-z]+\d+|\d+[a-z]+|\b[a-z]{4,}\b/g) ?? [];
}

function parseMoney(value) {
  const match = String(value ?? "").match(/([\d\s]+(?:[.,]\d+)?)\s*(?:EUR|€)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function extractFixedDiscount(value) {
  const match = String(value ?? "").match(
    /(?:€\s*)?(\d+(?:[.,]\d+)?)\s*€?\s*(?:off|de remise|de réduction)/i,
  );
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function findProduct(products, offer) {
  const offerText = `${offer?.title ?? ""} ${offer?.description ?? ""}`;
  const offerTokens = new Set(productTokens(offerText));
  const modelTokens = productTokens(offer?.title).filter((token) =>
    /^(?:i|x)\d{3}$/i.test(token),
  );
  const requiredTerms = ["lidar", "pro", "robot", "tondeuse"].filter((term) =>
    offerText.toLocaleLowerCase("fr").includes(term),
  );
  let best = null;
  let bestScore = 0;
  for (const product of products) {
    const productTitle = String(product.title ?? "");
    const productText = `${productTitle} ${product.product_type ?? ""}`;
    const productTextLower = productText.toLocaleLowerCase("fr");
    const productTokensList = productTokens(productText);
    const modelScore = modelTokens.filter((token) =>
      productTokensList.includes(token),
    ).length;
    const requiredScore = requiredTerms.filter((term) =>
      productTextLower.includes(term),
    ).length;
    const accessoryPenalty =
      /adaptateur|garage|lame|batterie|access\+|antenne/i.test(productTitle) &&
      !/accessoire|garage|lame|batterie|adaptateur/i.test(offerText)
        ? 5
        : 0;
    const score =
      modelScore * 20 +
      requiredScore * 5 +
      productTokensList.filter((token) => offerTokens.has(token)).length -
      accessoryPenalty;
    if (score > bestScore && /^https:\/\//i.test(product.image_link ?? "")) {
      best = product;
      bestScore = score;
    }
  }
  return best;
}

function slugify(value) {
  return (
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "awin"
  );
}

function normalizeBrandName(name) {
  return stripHtml(name)
    .replace(/\s+(fr|france)$/i, "")
    .trim();
}

function mapCategory(programme, offer) {
  const haystack = [
    programme?.primarySector,
    programme?.name,
    offer?.title,
    ...(Array.isArray(offer?.categories)
      ? offer.categories.map((category) =>
          typeof category === "string"
            ? category
            : category?.name ?? category?.categoryName,
        )
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/beauty|cosmetic|health|parfum|soin|makeup/.test(haystack)) {
    return "beaute";
  }
  if (/sport|fitness|outdoor|running|cycle/.test(haystack)) {
    return "sport";
  }
  if (/game|gaming|console|video game/.test(haystack)) {
    return "gaming";
  }
  if (/travel|hotel|flight|rail|tourism|voyage/.test(haystack)) {
    return "voyage";
  }
  if (/food|grocery|drink|meal|alimentation/.test(haystack)) {
    return "alimentation";
  }
  if (/home|garden|furniture|white goods|maison|interior/.test(haystack)) {
    return "maison";
  }
  if (
    /electronic|computer|mobile|telecom|software|appliance|photo/.test(
      haystack,
    )
  ) {
    return "high-tech";
  }
  return "mode";
}

function extractDiscount(...values) {
  const text = values.filter(Boolean).join(" ");
  const matches = [
    ...text.matchAll(
      /(?:-|−|jusqu['’]à|up to|save)?\s*(\d{1,2})\s*%/gi,
    ),
  ];
  const discounts = matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100);
  return discounts.length > 0 ? Math.max(...discounts) : 0;
}

function normalizeTerms(value) {
  const clean = stripHtml(value);
  if (!clean) {
    return ["Conditions détaillées disponibles sur le site de la marque."];
  }

  return clean
    .split(/(?:\r?\n|\s*[•·]\s*|\s*;\s*)/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function isRecent(value, now) {
  const date = new Date(value).getTime();
  return Number.isFinite(date) && now.getTime() - date < 72 * 60 * 60 * 1_000;
}

function toIsoDate(value, fallback) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function getOfferImage(offer, programme, categoryImages, category) {
  const offerImage =
    offer?.imageUrl ??
    offer?.image ??
    offer?.creative?.imageUrl ??
    offer?.creative?.image;
  if (typeof offerImage === "string" && /^https:\/\//i.test(offerImage)) {
    return offerImage;
  }

  const logo = programme?.logoUrl;
  if (typeof logo === "string" && /^https:\/\//i.test(logo)) {
    return logo;
  }
  return categoryImages[category];
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Awin a répondu ${response.status} pour ${url}`);
  }

  return response.json();
}

async function fetchProgrammes(relationship) {
  const url = new URL(
    `${API_BASE_URL}/publishers/${publisherId}/programmes`,
  );
  url.searchParams.set("countryCode", "FR");
  url.searchParams.set("relationship", relationship);
  const payload = await fetchJson(url);
  return Array.isArray(payload) ? payload : [];
}

async function fetchOffers(advertiserIds) {
  if (advertiserIds.length === 0) {
    return [];
  }

  const offers = [];
  let page = 1;
  let total = Infinity;

  while (offers.length < total) {
    const payload = await fetchJson(
      `${API_BASE_URL}/publisher/${publisherId}/promotions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            advertiserIds,
            membership,
            regionCodes: ["FR"],
            status: "active",
            type: "all",
          },
          pagination: { page, pageSize: PAGE_SIZE },
        }),
      },
    );

    const pageOffers = Array.isArray(payload?.data) ? payload.data : [];
    total =
      typeof payload?.pagination?.total === "number"
        ? payload.pagination.total
        : pageOffers.length;
    offers.push(...pageOffers);

    if (pageOffers.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return offers;
}

const categoryImages = {
  mode:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=82",
  sport:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=82",
  beaute:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=82",
  "high-tech":
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=82",
  gaming:
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=82",
  maison:
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=82",
  alimentation:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=82",
  voyage:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=82",
};

const relationships = membership === "joined" ? ["joined"] : ["joined", "pending"];
const programmeLists = await Promise.all(
  relationships.map((relationship) => fetchProgrammes(relationship)),
);
const programmes = programmeLists.flat();
const programmesById = new Map(
  programmes.map((programme) => [Number(programme.id), programme]),
);
const advertiserIds = [...programmesById.keys()];
const offers = await fetchOffers(advertiserIds);
const productRows = await fetchProductFeed();
const productsByAdvertiser = new Map();
for (const product of productRows) {
  const id = String(product.advertiser_id ?? "");
  if (!id) continue;
  const products = productsByAdvertiser.get(id) ?? [];
  products.push(product);
  productsByAdvertiser.set(id, products);
}
const now = new Date();
const nowIso = now.toISOString();

const normalizedPromotions = offers
  .map((offer) => {
    const advertiserId = Number(offer?.advertiser?.id);
    const programme = programmesById.get(advertiserId);
    const category = mapCategory(programme, offer);
    const brand = normalizeBrandName(
      programme?.name ?? offer?.advertiser?.name ?? "Partenaire Awin",
    );
    const description =
      stripHtml(offer?.description) ||
      "Découvrez cette offre partenaire sur le site de la marque.";
    const discount = extractDiscount(offer?.title, description);
    const expiresAt = new Date(offer?.endDate);
    const affiliateUrl = offer?.urlTracking || offer?.url;
    const product = findProduct(
      productsByAdvertiser.get(String(advertiserId)) ?? [],
      offer,
    );
    const productOriginalPrice = parseMoney(product?.price);
    const productSalePrice = parseMoney(product?.sale_price);
    const fixedDiscount = extractFixedDiscount(
      `${offer?.title ?? ""} ${offer?.description ?? ""}`,
    );
    const productCurrentPrice =
      productSalePrice ??
      (productOriginalPrice !== null && fixedDiscount !== null
        ? fixedDiscount < productOriginalPrice
          ? productOriginalPrice - fixedDiscount
          : null
        : null);
    const productDiscount =
      productOriginalPrice !== null &&
      productCurrentPrice !== null &&
      productCurrentPrice < productOriginalPrice
        ? Math.round((1 - productCurrentPrice / productOriginalPrice) * 100)
        : 0;

    if (
      !offer?.promotionId ||
      !offer?.title ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= now.getTime() ||
      typeof affiliateUrl !== "string" ||
      !/^https:\/\//i.test(affiliateUrl)
    ) {
      return null;
    }

    return {
      id: `awin-${offer.promotionId}`,
      brandId: `awin-${advertiserId}-${slugify(brand)}`,
      brand,
      merchant: brand,
      category,
      title: stripHtml(offer.title),
      ...(product?.title ? { productTitle: stripHtml(product.title) } : {}),
      description,
      originalPrice: productOriginalPrice ?? 0,
      currentPrice: productCurrentPrice ?? 0,
      discount: discount || productDiscount,
      savings:
        productOriginalPrice !== null && productCurrentPrice !== null
          ? Math.max(0, productOriginalPrice - productCurrentPrice)
          : 0,
      image:
        product?.image_link || getOfferImage(offer, programme, categoryImages, category),
      expiresAt: expiresAt.toISOString(),
      verifiedAt: nowIso,
      createdAt: toIsoDate(offer.dateAdded || offer.startDate, nowIso),
      ...(offer?.voucher?.code
        ? { promoCode: String(offer.voucher.code) }
        : {}),
      isNew: isRecent(offer.dateAdded, now),
      isExpired: false,
      onlineOnly: true,
      terms: normalizeTerms(offer.terms),
      tags: [
        "awin",
        offer.type === "voucher" ? "code-promo" : "promotion",
        category,
      ],
      source: "awin",
      sourceId: String(offer.promotionId),
      affiliateUrl,
      ...(product?.link ? { productUrl: product.link } : {}),
      offerType: offer.type === "voucher" ? "voucher" : "promotion",
    };
  })
  .filter(Boolean);

const promotions = [
  ...new Map(
    normalizedPromotions.map((promotion) => [promotion.id, promotion]),
  ).values(),
]
  .sort(
    (a, b) =>
      Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) ||
      b.discount - a.discount ||
      new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
  );

const feed = {
  version: 2,
  source: "awin",
  moderation: "pending-review",
  membership,
  publisherId,
  generatedAt: nowIso,
  programmeCount: programmes.length,
  offerCount: promotions.length,
  promotions,
};

await writeJsonAtomic(candidatesPath, feed);
const { counts, publicFeed } = await publishApprovedOffers({
  candidatesPath,
  moderationPath,
  outputPath,
});

console.log(
  `Synchronisation Awin terminée : ${promotions.length} candidate(s), ${programmes.length} programme(s), mode ${membership}.`,
);
console.log(
  `${counts.approved} approuvée(s), ${counts.pending} en attente, ${counts.rejected} refusée(s).`,
);
console.log(`File d’attente écrite dans ${candidatesPath}`);
console.log(
  `Flux public écrit dans ${outputPath} avec ${publicFeed.offerCount} offre(s).`,
);
