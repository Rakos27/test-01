import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const revealSelector = [
  ".home-hero__content > *",
  ".hero-deal",
  ".partner-feed-card",
  ".transparency-strip__inner > *",
  ".section-heading",
  ".promotion-grid > .promotion-card:not(.skeleton-card)",
  ".recommendations-grid > *",
  ".catalog-hero__content > *",
  ".catalog-hero__stats > div",
  ".catalog-toolbar",
  ".alphabet-filter",
  ".brand-catalog-grid > *",
  ".category-catalog-grid > *",
  ".catalog-note",
  ".brand-detail-hero > *",
  ".brand-detail-stats > div",
  ".brand-trust-strip > *",
  ".related-brands > *",
  ".offer-detail__media",
  ".offer-detail__content > *",
  ".size-guide > *",
  ".offer-trust__grid > *",
  ".offer-report",
  ".editorial-hero > *",
  ".editorial-content > *",
  ".editorial-aside > *",
  ".account-hero > *",
  ".account-layout > *",
  ".favorites-section > *",
  ".legal-document > *",
].join(",");

const scaleSelectors = [
  ".promotion-card",
  ".brand-catalog-card",
  ".category-catalog-card",
  ".hero-deal",
  ".offer-detail__media",
].join(",");

export function MotionController() {
  const { pathname } = useLocation();

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) {
      return;
    }

    document.documentElement.classList.add("motion-enabled");
    return () => document.documentElement.classList.remove("motion-enabled");
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const main = document.getElementById("main-content");
    if (!main) {
      return;
    }

    let order = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-motion-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -5% 0px",
      },
    );

    const prepare = (root: ParentNode) => {
      const elements = [
        ...(root instanceof HTMLElement && root.matches(revealSelector)
          ? [root]
          : []),
        ...root.querySelectorAll<HTMLElement>(revealSelector),
      ];

      elements.forEach((element) => {
        if (element.dataset.motionReady === "true") {
          return;
        }

        element.dataset.motionReady = "true";
        element.classList.add("motion-reveal");
        if (element.matches(scaleSelectors)) {
          element.classList.add("motion-reveal--scale");
        }
        element.style.setProperty("--motion-order", String(order % 6));
        order += 1;
        observer.observe(element);
      });
    };

    prepare(main);

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            prepare(node);
          }
        });
      });
    });
    mutationObserver.observe(main, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
