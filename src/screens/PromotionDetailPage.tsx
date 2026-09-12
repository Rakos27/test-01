import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Heart,
  Info,
  MessageSquareWarning,
  ShieldCheck,
  Share2,
  Store,
  Tag,
  Ruler,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdSlot, adSenseSlots } from "../components/AdSense";
import { OfferTrustPanel } from "../components/OfferTrustPanel";
import { PromotionCard } from "../components/PromotionCard";
import { useApp } from "../context/AppContext";
import { daysUntil, formatDate, formatPrice } from "../lib/format";
import { getOfferReportUrl } from "../lib/trust";

export default function PromotionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    promotions,
    favorites,
    toggleFavorite,
    recordView,
    showToast,
    isFeedLoading,
  } = useApp();
  const [copied, setCopied] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const promotion = promotions.find((item) => item.id === id);

  useEffect(() => {
    if (id && promotion) recordView(id);
  }, [id, promotion, recordView]);

  const similar = useMemo(() => {
    if (!promotion) return [];
    return promotions
      .filter(
        (item) =>
          item.id !== promotion.id &&
          !item.isExpired &&
          (item.category === promotion.category ||
            item.brandId === promotion.brandId),
      )
      .sort((a, b) => {
        const aSameBrand = a.brandId === promotion.brandId ? 1 : 0;
        const bSameBrand = b.brandId === promotion.brandId ? 1 : 0;
        return bSameBrand - aSameBrand || b.discount - a.discount;
      })
      .slice(0, 3);
  }, [promotion, promotions]);

  if (!promotion) {
    if (isFeedLoading) {
      return (
        <main className="page-shell container">
          <div className="empty-state standalone-empty" aria-live="polite">
            <span className="eyebrow">Chargement</span>
            <h1>Vérification de l’offre partenaire…</h1>
          </div>
        </main>
      );
    }

    return (
      <main className="page-shell container">
        <div className="empty-state standalone-empty">
          <span className="eyebrow">Offre introuvable</span>
          <h1>Cette promotion n’existe plus.</h1>
          <p>
            Elle a peut-être expiré, été retirée par l’annonceur ou son
            identifiant est incorrect.
          </p>
          <Link className="button button--dark" to="/">
            Revenir aux promotions
          </Link>
        </div>
      </main>
    );
  }

  const saved = favorites.includes(promotion.id);
  const expired = promotion.isExpired || daysUntil(promotion.expiresAt) < 0;
  const isPartner = promotion.source === "awin";
  const isDemo = promotion.source === "demo";
  const hasPrice = promotion.currentPrice > 0;
  const sizeOptions = promotion.sizeOptions ?? [];
  const hasSizeGuide = Boolean(promotion.sizeGuide && sizeOptions.length);

  const copyCode = async () => {
    if (!promotion.promoCode) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Presse-papiers indisponible");
      }
      await navigator.clipboard.writeText(promotion.promoCode);
      setCopied(true);
      showToast(`Code ${promotion.promoCode} copié`, "success");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Impossible de copier le code. Copiez-le manuellement.", "danger");
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: promotion.title,
          text:
            promotion.discount > 0
              ? `${promotion.brand} à −${promotion.discount}% sur Dealyva`
              : `${promotion.brand} sur Dealyva`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Lien copié dans le presse-papiers", "success");
      }
    } catch {
      // Native share cancellation.
    }
  };

  const goBack = () => {
    const historyIndex =
      typeof window.history.state?.idx === "number"
        ? window.history.state.idx
        : 0;

    if (historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <main className="detail-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d’Ariane">
          <Link to="/">Promotions</Link>
          <span>/</span>
          <Link to={`/?categorie=${promotion.category}`}>{promotion.category}</Link>
          <span>/</span>
          <Link to={`/marque/${promotion.brandId}`}>{promotion.brand}</Link>
          <span>/</span>
          <span aria-current="page">{promotion.title}</span>
        </nav>
        <button className="back-link" type="button" onClick={goBack}>
          <ArrowLeft size={16} /> Retour
        </button>

        <section
          className={`offer-detail ${expired ? "offer-detail--expired" : ""}${
            isPartner ? " offer-detail--partner" : ""
          }${isDemo ? " offer-detail--demo" : ""}`}
        >
          <div className="offer-detail__media">
            <img src={promotion.image} alt={promotion.productTitle ?? promotion.title} />
            {isDemo && (
              <span className="demo-badge">Démonstration fictive</span>
            )}
            <div className="offer-detail__media-top">
              {promotion.discount > 0 && (
                <span className="discount-badge discount-badge--large">
                  −{promotion.discount}%
                </span>
              )}
              {isPartner && <span className="partner-badge">Offre partenaire</span>}
              {promotion.isNew && !expired && (
                <span className="new-badge">Nouveau</span>
              )}
              {expired && <span className="expired-badge">Offre expirée</span>}
            </div>
          </div>
          <div className="offer-detail__content">
            <div className="offer-detail__eyebrow">
              <span className="brand-label">{promotion.brand}</span>
              <span>chez {promotion.merchant}</span>
            </div>
            <h1>{promotion.productTitle ?? promotion.title}</h1>
            {promotion.productTitle && promotion.productTitle !== promotion.title && (
              <p className="offer-detail__promo-title">{promotion.title}</p>
            )}
            <p className="offer-detail__description">{promotion.description}</p>
            {hasPrice && (
              <div className="offer-detail__price">
                <strong>{formatPrice(promotion.currentPrice)}</strong>
                <s>{formatPrice(promotion.originalPrice)}</s>
                <span className="detail-promo-highlight">
                  <Tag size={15} />
                  Prix en promotion · −{promotion.discount}% · vous économisez{" "}
                  {formatPrice(promotion.savings)}
                </span>
              </div>
            )}

            {hasSizeGuide && !expired && (
              <fieldset className="detail-size-picker">
                <legend>
                  <span>Choisir une taille</span>
                  <small>
                    {selectedSize
                      ? `Taille ${selectedSize} sélectionnée`
                      : "Les tailles en rouge bénéficient de la promotion"}
                  </small>
                </legend>
                <div className="detail-size-picker__options">
                  {sizeOptions.map((size) => (
                    <button
                      key={size.label}
                      type="button"
                      className={[
                        size.status === "discounted" ? "is-discounted" : "",
                        size.status === "unavailable" ? "is-unavailable" : "",
                        selectedSize === size.label ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedSize(size.label)}
                      disabled={size.status === "unavailable"}
                      aria-pressed={selectedSize === size.label}
                      aria-label={`${size.label}${
                        size.status === "discounted"
                          ? ", en promotion"
                          : size.status === "unavailable"
                            ? ", indisponible"
                            : ", prix standard"
                      }`}
                    >
                      <strong>{size.label}</strong>
                      <small>
                        {size.status === "discounted"
                          ? "Promo"
                          : size.status === "unavailable"
                            ? "Épuisée"
                            : "Standard"}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="detail-size-picker__legend">
                  <span><i className="is-promo" /> Taille en promotion</span>
                  <span><i /> Prix standard</span>
                  <span><i className="is-sold-out" /> Indisponible</span>
                </div>
              </fieldset>
            )}

            {promotion.promoCode && !expired && (
              <div className="detail-code">
                <div>
                  <Tag size={17} aria-hidden="true" />
                  <span>
                    <small>Code promotionnel</small>
                    <strong>{promotion.promoCode}</strong>
                  </span>
                </div>
                <button type="button" onClick={copyCode}>
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>
            )}

            <div className="offer-detail__facts">
              <span>
                <CalendarDays size={18} />
                <span>
                  <small>{expired ? "Terminée le" : "Valable jusqu’au"}</small>
                  <strong>{formatDate(promotion.expiresAt)}</strong>
                </span>
              </span>
              <span>
                <Store size={18} />
                <span>
                  <small>Disponibilité</small>
                  <strong>Exclusivement en ligne</strong>
                </span>
              </span>
              <span>
                <ShieldCheck size={18} />
                <span>
                  <small>
                    {isDemo
                      ? "Données de démonstration"
                      : "Dernière synchronisation Awin"}
                  </small>
                  <strong>
                    {isDemo ? "Aucune donnée commerciale" : formatDate(promotion.verifiedAt)}
                  </strong>
                </span>
              </span>
            </div>

            <div className="offer-detail__actions">
              {isPartner && promotion.affiliateUrl && !expired ? (
                <a
                  className="button button--primary button--large"
                  href={promotion.affiliateUrl}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                >
                  Voir l’offre chez {promotion.brand}
                  <ExternalLink size={17} />
                </a>
              ) : isDemo && !expired ? (
                <button
                  type="button"
                  className="button button--primary button--large"
                  onClick={() =>
                    showToast(
                      "Démonstration : aucun achat réel n’est effectué.",
                      "success",
                    )
                  }
                >
                  Tester le bouton (démo)
                  <ExternalLink size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  className="button button--primary button--large"
                  disabled={expired}
                >
                  {expired ? "Cette offre est expirée" : "Lien indisponible"}
                </button>
              )}
              <button
                type="button"
                className={`button button--icon-text ${saved ? "is-active" : ""}`}
                onClick={() => toggleFavorite(promotion.id)}
                aria-pressed={saved}
              >
                <Heart size={19} fill={saved ? "currentColor" : "none"} />
                {saved ? "Sauvegardée" : "Sauvegarder"}
              </button>
              <button
                type="button"
                className="icon-button detail-share"
                onClick={share}
                aria-label="Partager l’offre"
              >
                <Share2 size={19} />
              </button>
            </div>
            <div className="affiliate-callout">
              <Info size={17} />
              <p>
                {isDemo
                  ? "Annonce entièrement fictive créée pour tester le fonctionnement de Dealyva. Aucun marchand, partenariat, produit ou achat réel n’est associé à cette fiche."
                  : "Offre transmise par Awin et vérifiée lors de la dernière synchronisation. Les conditions finales sont celles affichées sur le site du marchand. Ce lien peut rémunérer Dealyva sans modifier votre prix."}
              </p>
            </div>
          </div>
        </section>

        {hasSizeGuide && (
          <section className="size-guide" aria-labelledby="size-guide-title">
            <div className="size-guide__intro">
              <span className="size-guide__icon">
                <Ruler size={23} />
              </span>
              <span className="eyebrow">Bien choisir</span>
              <h2 id="size-guide-title">Guide des tailles</h2>
              <p>
                {promotion.sizeGuide === "shoes"
                  ? "Mesurez votre pied du talon jusqu’à l’orteil le plus long. Les mesures du marchand restent prioritaires."
                  : "Mesurez votre tour de poitrine et votre tour de taille sans serrer. Les mesures du marchand restent prioritaires."}
              </p>
            </div>
            <div className="size-guide__table-wrap">
              {promotion.sizeGuide === "shoes" ? (
                <table>
                  <thead>
                    <tr>
                      <th>Pointure FR</th>
                      <th>Longueur du pied</th>
                      <th>Pointure UK</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><th>37–38</th><td>23,5–24 cm</td><td>4–5</td></tr>
                    <tr><th>39–40</th><td>24,5–25,5 cm</td><td>6–6,5</td></tr>
                    <tr><th>41–42</th><td>26–27 cm</td><td>7–8</td></tr>
                    <tr><th>43–44</th><td>27,5–28,5 cm</td><td>9–10</td></tr>
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Taille</th>
                      <th>Poitrine</th>
                      <th>Tour de taille</th>
                      <th>FR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><th>XS</th><td>78–82 cm</td><td>60–64 cm</td><td>34</td></tr>
                    <tr><th>S</th><td>83–88 cm</td><td>65–70 cm</td><td>36</td></tr>
                    <tr><th>M</th><td>89–94 cm</td><td>71–76 cm</td><td>38–40</td></tr>
                    <tr><th>L</th><td>95–102 cm</td><td>77–84 cm</td><td>42–44</td></tr>
                    <tr><th>XL</th><td>103–110 cm</td><td>85–94 cm</td><td>46</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        <section className="offer-conditions">
          <div>
            <span className="eyebrow">Bon à savoir</span>
            <h2>Conditions de l’offre</h2>
          </div>
          <ul>
            {promotion.terms.map((term) => (
              <li key={term}>
                <CheckCircle2 size={17} />
                <span>{term}</span>
              </li>
            ))}
          </ul>
          <div className="merchant-note">
            <strong>{isDemo ? "À propos de cette fiche" : "Avant de poursuivre"}</strong>
            <p>
              {isDemo
                ? "Les prix, remises, codes et dates sont simulés. Cette fiche ne permet aucun achat et disparaîtra lorsque les premières offres partenaires seront publiées."
                : "Vérifiez le prix, la disponibilité et toutes les conditions directement sur le site du marchand avant votre achat."}
            </p>
          </div>
        </section>

        <OfferTrustPanel promotion={promotion} />

        {!isDemo && <aside className="offer-report">
          <div>
            <MessageSquareWarning aria-hidden="true" size={19} />
            <span>
              <strong>Une information semble incorrecte ?</strong>
              <small>
                Signalez une offre expirée, un code invalide ou une condition
                manquante.
              </small>
            </span>
          </div>
          <a
            className="button button--outline"
            href={getOfferReportUrl(promotion)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Signaler cette offre
          </a>
        </aside>}

        <AdSlot slot={adSenseSlots.detail} placement="detail" />

        {similar.length > 0 && (
          <section className="similar-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">À découvrir aussi</span>
                <h2>Des offres dans le même esprit.</h2>
              </div>
              <Link to={`/?categorie=${promotion.category}`} className="text-link">
                Tout voir <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="promotion-grid promotion-grid--three">
              {similar.map((item) => (
                <PromotionCard promotion={item} key={item.id} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
