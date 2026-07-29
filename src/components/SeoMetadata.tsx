import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { faqItems } from "../data/faq";

const staticPages: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Promotions partenaires vérifiées",
    description:
      "Découvrez les promotions en ligne d’annonceurs partenaires, vérifiées et classées simplement par Dealyva.",
  },
  "/marques": {
    title: "Marques partenaires",
    description:
      "Parcourez les marques partenaires présentes sur Dealyva et retrouvez leurs promotions en cours.",
  },
  "/categories": {
    title: "Catégories de promotions",
    description:
      "Mode, beauté, high-tech, sport, maison ou voyage : explorez les promotions Dealyva par catégorie.",
  },
  "/favoris": {
    title: "Mes favoris",
    description:
      "Retrouvez les promotions sauvegardées localement dans votre navigateur.",
  },
  "/compte": {
    title: "Mon espace personnalisé",
    description:
      "Créez un profil local Dealyva et choisissez vos marques préférées pour personnaliser les recommandations sur cet appareil.",
  },
  "/a-propos": {
    title: "À propos",
    description:
      "Découvrez la mission de Dealyva, sa méthode de sélection et son modèle d’affiliation transparent.",
  },
  "/comment-ca-marche": {
    title: "Comment fonctionne Dealyva ?",
    description:
      "Comprenez comment les promotions sont synchronisées, vérifiées et reliées aux sites marchands.",
  },
  "/faq": {
    title: "Questions fréquentes",
    description:
      "Les réponses aux questions fréquentes sur les promotions, l’affiliation, les favoris et les données utilisées par Dealyva.",
  },
  "/mentions-legales": {
    title: "Mentions légales",
    description:
      "Informations relatives à l’éditeur, à l’hébergement et au fonctionnement du site Dealyva.",
  },
  "/conditions-utilisation": {
    title: "Conditions d’utilisation",
    description:
      "Conditions générales encadrant l’accès gratuit et l’utilisation du service Dealyva.",
  },
  "/confidentialite": {
    title: "Politique de confidentialité",
    description:
      "Données locales, hébergement, affiliation et droits des utilisateurs de Dealyva.",
  },
  "/cookies": {
    title: "Cookies et traceurs",
    description:
      "Fonctionnement du stockage local, des traceurs d’affiliation et des choix publicitaires sur Dealyva.",
  },
};

function setMeta(selector: string, attribute: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    const [name, property] = selector.includes("property=")
      ? ["property", selector.match(/property="([^"]+)"/)?.[1]]
      : ["name", selector.match(/name="([^"]+)"/)?.[1]];
    if (property) element.setAttribute(name, property);
    document.head.append(element);
  }

  element.setAttribute(attribute, value);
}

function siteBaseUrl() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  return `${window.location.origin}${basePath === "/" ? "" : basePath}`;
}

export function SeoMetadata() {
  const { pathname } = useLocation();
  const { promotions, brands, categories } = useApp();

  const metadata = useMemo(() => {
    const promotionId = pathname.match(/^\/offre\/([^/]+)$/)?.[1];
    const brandId = pathname.match(/^\/marque\/([^/]+)$/)?.[1];
    const promotion = promotionId
      ? promotions.find((item) => item.id === promotionId)
      : undefined;
    const brand = brandId
      ? brands.find((item) => item.id === brandId)
      : undefined;
    const category = brand
      ? categories.find((item) => item.id === brand.category)
      : undefined;

    if (promotion) {
      const isDemo = promotion.source === "demo";
      return {
        title: `${promotion.brand} — ${promotion.title}`,
        description: isDemo
          ? `${promotion.description} Scénario fictif sans achat réel, affiché pour tester Dealyva.`
          : `${promotion.description} Offre partenaire vérifiée sur Dealyva. Vérifiez le prix et les conditions chez ${promotion.merchant}.`,
        image: promotion.image,
        breadcrumbs: [
          ["Promotions", "/"],
          [promotion.category, `/?categorie=${promotion.category}`],
          [promotion.brand, `/marque/${promotion.brandId}`],
          [promotion.title, pathname],
        ],
      };
    }

    if (brand) {
      const brandPromotions = promotions.filter(
        (item) => item.brandId === brand.id && !item.isExpired,
      );
      const count = brandPromotions.length;
      const isDemo =
        count > 0 && brandPromotions.every((item) => item.source === "demo");
      return {
        title: `Promotions ${brand.name}`,
        description: isDemo
          ? `${brand.name} est une marque fictive du catalogue de démonstration Dealyva${category ? ` dans la catégorie ${category.name}` : ""}. Aucun achat réel.`
          : `Retrouvez ${count || "les"} promotion${count === 1 ? "" : "s"} ${brand.name} vérifiée${count === 1 ? "" : "s"} sur Dealyva${category ? ` dans la catégorie ${category.name}` : ""}.`,
        breadcrumbs: [
          ["Promotions", "/"],
          ["Marques", "/marques"],
          [brand.name, pathname],
        ],
      };
    }

    return {
      ...(staticPages[pathname] ?? {
        title: "Page introuvable",
        description:
          "Cette page n’est pas disponible. Retrouvez les promotions partenaires sur Dealyva.",
      }),
      breadcrumbs:
        pathname === "/"
          ? []
          : [
              ["Promotions", "/"],
              [staticPages[pathname]?.title ?? "Page", pathname],
            ],
    };
  }, [brands, categories, pathname, promotions]);

  useEffect(() => {
    const baseUrl = siteBaseUrl();
    const cleanPath = pathname === "/" ? "" : pathname;
    const hashMode = import.meta.env.VITE_ROUTER_MODE === "hash";
    const pageUrl = hashMode
      ? `${baseUrl}/${cleanPath ? `#${cleanPath}` : ""}`
      : `${baseUrl}${cleanPath}`;
    const canonicalUrl = hashMode && pathname !== "/" ? null : pageUrl;
    const title = `${metadata.title} — Dealyva`;
    const defaultImage = `${baseUrl}/brand/dealyva-social-card.png`;
    const image = "image" in metadata && metadata.image
      ? metadata.image
      : defaultImage;

    document.title = title;
    setMeta('meta[name="description"]', "content", metadata.description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta(
      'meta[property="og:description"]',
      "content",
      metadata.description,
    );
    setMeta('meta[property="og:url"]', "content", pageUrl);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:site_name"]', "content", "Dealyva");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta(
      'meta[name="twitter:description"]',
      "content",
      metadata.description,
    );
    setMeta('meta[name="twitter:image"]', "content", image);

    const existingCanonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonicalUrl) {
      existingCanonical?.remove();
    } else {
      let canonical = existingCanonical;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = canonicalUrl;
    }

    const graph: Record<string, unknown>[] = [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Dealyva",
        url: `${baseUrl}/`,
        logo: `${baseUrl}/brand/dealyva-logo-carre.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        name: "Dealyva",
        url: `${baseUrl}/`,
        publisher: { "@id": `${baseUrl}/#organization` },
        inLanguage: "fr-FR",
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        name: title,
        description: metadata.description,
        url: pageUrl,
        isPartOf: { "@id": `${baseUrl}/#website` },
        inLanguage: "fr-FR",
      },
    ];

    if (metadata.breadcrumbs.length > 1) {
      graph.push({
        "@type": "BreadcrumbList",
        itemListElement: metadata.breadcrumbs.map(
          ([name, route], index) => ({
            "@type": "ListItem",
            position: index + 1,
            name,
            item: `${baseUrl}${route === "/" ? "" : route}`,
          }),
        ),
      });
    }

    if (pathname === "/faq") {
      graph.push({
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      });
    }

    let structuredData = document.getElementById("dealyva-structured-data");
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.id = "dealyva-structured-data";
      structuredData.setAttribute("type", "application/ld+json");
      document.head.append(structuredData);
    }
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph,
    });
  }, [metadata, pathname]);

  return null;
}
