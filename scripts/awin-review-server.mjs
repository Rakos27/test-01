import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import {
  DEFAULT_CANDIDATES_PATH,
  DEFAULT_MODERATION_PATH,
  DEFAULT_PUBLIC_FEED_PATH,
  getDecisionStatus,
  publishApprovedOffers,
  readJson,
  readModeration,
  setDecision,
  summarizeReview,
  writeJsonAtomic,
} from "./lib/awin-moderation.mjs";

const host = process.env.AWIN_REVIEW_HOST?.trim() || "127.0.0.1";
const port = Number(process.env.AWIN_REVIEW_PORT || 4174);
const candidatesPath =
  process.env.AWIN_CANDIDATES_PATH?.trim() || DEFAULT_CANDIDATES_PATH;
const moderationPath =
  process.env.AWIN_MODERATION_PATH?.trim() || DEFAULT_MODERATION_PATH;
const outputPath =
  process.env.AWIN_OUTPUT_PATH?.trim() || DEFAULT_PUBLIC_FEED_PATH;
const ui = await readFile(
  new URL("./awin-review-ui.html", import.meta.url),
  "utf8",
);

let syncInProgress = false;

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(`${JSON.stringify(value)}\n`);
}

async function readRequestBody(request) {
  const chunks = [];
  let length = 0;

  for await (const chunk of request) {
    length += chunk.length;
    if (length > 64 * 1024) {
      throw new Error("Requête trop volumineuse.");
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function getReviewState() {
  const candidateFeed = await readJson(candidatesPath, {
    version: 2,
    generatedAt: null,
    promotions: [],
  });
  const moderation = await readModeration(moderationPath);
  const promotions = Array.isArray(candidateFeed?.promotions)
    ? candidateFeed.promotions.map((promotion) => {
        const decision = moderation.decisions[promotion.id];
        return {
          ...promotion,
          reviewStatus: getDecisionStatus(moderation, promotion.id),
          reviewedAt: decision?.reviewedAt ?? null,
          reviewNote: decision?.note ?? "",
        };
      })
    : [];

  return {
    generatedAt: candidateFeed?.generatedAt ?? null,
    programmeCount: Number(candidateFeed?.programmeCount) || 0,
    syncInProgress,
    counts: summarizeReview(candidateFeed, moderation),
    promotions,
  };
}

function runAwinSync() {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, ["scripts/awin-sync.mjs"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise(output.trim());
      } else {
        rejectPromise(
          new Error(output.trim() || `La synchronisation a échoué (${code}).`),
        );
      }
    });
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");

  try {
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
      });
      response.end(ui);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/review") {
      sendJson(response, 200, await getReviewState());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/sync") {
      if (syncInProgress) {
        sendJson(response, 409, {
          error: "Une synchronisation est déjà en cours.",
        });
        return;
      }

      syncInProgress = true;
      try {
        const output = await runAwinSync();
        sendJson(response, 200, {
          message: output || "Synchronisation terminée.",
          state: await getReviewState(),
        });
      } finally {
        syncInProgress = false;
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/decision") {
      const body = await readRequestBody(request);
      const candidateFeed = await readJson(candidatesPath);
      const promotions = Array.isArray(candidateFeed?.promotions)
        ? candidateFeed.promotions
        : [];

      if (
        typeof body.id !== "string" ||
        !promotions.some((promotion) => promotion.id === body.id)
      ) {
        sendJson(response, 400, { error: "Offre inconnue." });
        return;
      }

      if (!["pending", "approved", "rejected"].includes(body.status)) {
        sendJson(response, 400, { error: "Décision invalide." });
        return;
      }

      const moderation = await readModeration(moderationPath);
      const nextModeration = setDecision(
        moderation,
        body.id,
        body.status,
        typeof body.note === "string" ? body.note : "",
      );
      await writeJsonAtomic(moderationPath, nextModeration);
      sendJson(response, 200, await getReviewState());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/publish") {
      const result = await publishApprovedOffers({
        candidatesPath,
        moderationPath,
        outputPath,
      });
      sendJson(response, 200, {
        message: `${result.publicFeed.offerCount} offre(s) préparée(s) pour publication.`,
        state: await getReviewState(),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    sendJson(response, 404, { error: "Page introuvable." });
  } catch (error) {
    sendJson(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
    });
  }
});

server.listen(port, host, () => {
  console.log("Centre de contrôle Awin prêt.");
  console.log(`Ouvrez http://localhost:${port}`);
  console.log(`File locale : ${resolve(candidatesPath)}`);
  console.log("Le jeton Awin n’est jamais envoyé au navigateur.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
