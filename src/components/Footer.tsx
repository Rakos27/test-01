import { Link } from "react-router-dom";
import {
  adSenseEnabled,
  openAdPrivacySettings,
} from "./AdSense";
import { useApp } from "../context/AppContext";
import { Logo } from "./Logo";

export function Footer() {
  const { promotions } = useApp();
  const isDemoCatalog =
    promotions.length > 0 &&
    promotions.every((promotion) => promotion.source === "demo");

  return (
    <footer className="footer">
      <div className="container footer__top">
        <div className="footer__brand">
          <Logo />
          <p>Les meilleurs deals, partout.</p>
          <span>
            {isDemoCatalog
              ? "Catalogue fictif pour tester toutes les fonctionnalités."
              : "Sélection indépendante d’offres partenaires vérifiées."}
          </span>
        </div>
        <div className="footer__links" aria-label="Liens de pied de page">
          <div>
            <strong>Explorer</strong>
            <Link to="/">Promotions</Link>
            <Link to="/marques">Marques</Link>
            <Link to="/categories">Catégories</Link>
            <Link to="/compte">Mon compte</Link>
          </div>
          <div>
            <strong>Dealyva</strong>
            <Link to="/a-propos">À propos</Link>
            <Link to="/comment-ca-marche">Comment ça marche</Link>
            <Link to="/faq">Questions fréquentes</Link>
          </div>
          <div>
            <strong>Informations légales</strong>
            <Link to="/mentions-legales">Mentions légales</Link>
            <Link to="/conditions-utilisation">Conditions d’utilisation</Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/cookies">Cookies</Link>
            {adSenseEnabled && (
              <button
                className="footer-privacy-button"
                type="button"
                onClick={openAdPrivacySettings}
              >
                Gérer mes choix publicitaires
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>© 2026 Dealyva.</span>
        <span>
          {isDemoCatalog
            ? "Mode démonstration : aucune offre ni transaction réelle."
            : "Liens affiliés : Dealyva peut percevoir une commission."}
        </span>
      </div>
    </footer>
  );
}
