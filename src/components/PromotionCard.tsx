import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Heart,
  Share2,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Promotion } from "../types";
import { daysUntil, formatDate, formatPrice } from "../lib/format";
import { getOfferTrust } from "../lib/trust";
import { useApp } from "../context/AppContext";

function getDisplayTitle(promotion: Promotion) {
  if (promotion.productTitle?.trim()) return promotion.productTitle.trim();
  const title = promotion.title.trim();

  if (/^use code\b/i.test(title)) {
    const product = title
      .replace(/^use code\b.*?\b(?:on|for)\s+/i, "")
      .replace(/\s+valid from\b.*$/i, "")
      .replace(/\.$/, "")
      .trim();
    if (product) return product;
  }

  if (/^[A-Z0-9_-]{3,16}$/.test(title) && promotion.description) {
    const description = promotion.description.split(/[.!?]/)[0].trim();
    if (/\b(?:sur|on|pour)\b/i.test(description)) return description;
  }

  return title;
}

function getSavingsLabel(promotion: Promotion) {
  if (promotion.discount > 0) return `−${promotion.discount}%`;
  const match = `${promotion.title} ${promotion.description}`.match(
    /(?:jusqu['’à]\s*)?(?:€\s*)?(\d+(?:[.,]\d+)?)\s*€?\s*(?:de remise|off|offre|d'économie|d’économie)/i,
  );
  return match ? `−${match[1].replace(",", ".")} €` : null;
}

interface PromotionCardProps {
  promotion: Promotion;
  reason?: string;
  compact?: boolean;
}

export function PromotionCard({
  promotion,
  reason,
  compact = false,
}: PromotionCardProps) {
  const { favorites, toggleFavorite, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [favoriteBurst, setFavoriteBurst] = useState(false);
  const favoriteTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);
  const saved = favorites.includes(promotion.id);
  const remainingDays = daysUntil(promotion.expiresAt);
  const expired = promotion.isExpired || remainingDays < 0;
  const isPartner = promotion.source === "awin";
  const isDemo = promotion.source === "demo";
  const hasPrice = promotion.currentPrice > 0;
  const trust = getOfferTrust(promotion);
  const displayTitle = getDisplayTitle(promotion);
  const savingsLabel = getSavingsLabel(promotion);

  useEffect(
    () => () => {
      if (favoriteTimer.current !== null) {
        window.clearTimeout(favoriteTimer.current);
      }
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    },
    [],
  );

  const updateFavorite = () => {
    const willSave = !saved;
    toggleFavorite(promotion.id);

    if (willSave) {
      setFavoriteBurst(false);
      window.requestAnimationFrame(() => setFavoriteBurst(true));
      if (favoriteTimer.current !== null) {
        window.clearTimeout(favoriteTimer.current);
      }
      favoriteTimer.current = window.setTimeout(
        () => setFavoriteBurst(false),
        620,
      );
    }
  };

  const copyCode = async () => {
    if (!promotion.promoCode) return;
    try {
      await navigator.clipboard.writeText(promotion.promoCode);
      setCopied(true);
      showToast(`Code ${promotion.promoCode} copié`, "success");
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast(`Code : ${promotion.promoCode}`);
    }
  };

  const share = async () => {
    const route = `/offre/${promotion.id}`;
    const url =
      import.meta.env.VITE_ROUTER_MODE === "hash"
        ? `${window.location.href.split("#")[0]}#${route}`
        : new URL(route, window.location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: promotion.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Lien de l’offre copié", "success");
      }
    } catch {
      // Closing the native share dialog is not an application error.
    }
  };

  return (
    <article
      className={[
        "promotion-card",
        compact ? "promotion-card--compact" : "",
        expired ? "promotion-card--expired" : "",
        saved ? "promotion-card--saved" : "",
        isPartner ? "promotion-card--partner" : "",
        isDemo ? "promotion-card--demo" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="promotion-card__media">
        <Link to={`/offre/${promotion.id}`} aria-label={`Voir ${displayTitle}`}>
          <img src={promotion.image} alt={displayTitle} loading="lazy" />
        </Link>
        {isDemo && (
          <span className="demo-badge demo-badge--compact">
            Démonstration
          </span>
        )}
        <div className="promotion-card__badges">
          {savingsLabel && (
            <span className="discount-badge">{savingsLabel}</span>
          )}
          {isPartner && <span className="partner-badge">Partenaire</span>}
          {promotion.isNew && !expired && <span className="new-badge">Nouveau</span>}
          {expired && <span className="expired-badge">Expirée</span>}
        </div>
        <div className="promotion-card__quick-actions">
          <button
            type="button"
            className={[
              "card-icon-button",
              saved ? "is-active" : "",
              favoriteBurst ? "is-celebrating" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={updateFavorite}
            aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={saved}
          >
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="card-icon-button"
            onClick={share}
            aria-label="Partager cette offre"
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>
      <div className="promotion-card__body">
        {reason && <p className="recommendation-reason">{reason}</p>}
        <div className="promotion-card__meta">
          <Link
            className="brand-label"
            to={`/marque/${promotion.brandId}`}
            aria-label={`Voir la page ${promotion.brand}`}
          >
            {promotion.brand}
          </Link>
          <span>chez {promotion.merchant}</span>
        </div>
        <Link to={`/offre/${promotion.id}`} className="promotion-card__title">
          <h3>{displayTitle}</h3>
        </Link>
        {hasPrice ? (
          <div className="promotion-card__pricing">
            <strong>{formatPrice(promotion.currentPrice)}</strong>
            {promotion.originalPrice > promotion.currentPrice && (
              <span className="old-price">{formatPrice(promotion.originalPrice)}</span>
            )}
            <span className="saving">
              {promotion.savings > 0
                ? `Après remise · économisez ${formatPrice(promotion.savings)}`
                : "Prix catalogue partenaire"}
            </span>
          </div>
        ) : (
          (isPartner || isDemo) && (
            <p className="promotion-card__partner-note">
              {isDemo
                ? "Scénario fictif pour tester Dealyva"
                : "Offre vérifiée auprès du partenaire"}
            </p>
          )
        )}
        {promotion.promoCode && !expired && (
          <button
            type="button"
            className={`promo-code${copied ? " is-copied" : ""}`}
            onClick={copyCode}
          >
            <span>
              <small>{copied ? "Copié" : "Code"}</small>
              <strong>{promotion.promoCode}</strong>
            </span>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        )}
        <div className="promotion-card__footer">
          <div className="promotion-card__status">
            <span className={remainingDays <= 3 && !expired ? "is-urgent" : ""}>
              <Clock3 size={14} aria-hidden="true" />
              {expired
                ? `Expirée le ${formatDate(promotion.expiresAt)}`
                : remainingDays === 0
                  ? "Se termine aujourd’hui"
                  : remainingDays === 1
                    ? "Plus qu’un jour"
                    : `Jusqu’au ${formatDate(promotion.expiresAt, { year: undefined })}`}
            </span>
            {!expired && (
              <small className={trust.recent ? "is-verified" : "is-warning"}>
                {trust.verifiedLabel}
              </small>
            )}
          </div>
          <Link
            to={`/offre/${promotion.id}`}
            className={`card-cta ${expired ? "is-disabled" : ""}`}
            aria-disabled={expired}
          >
            {expired ? "Voir le détail" : "Voir l’offre"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
