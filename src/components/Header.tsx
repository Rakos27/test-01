import { useEffect, useRef, useState } from "react";
import {
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Logo } from "./Logo";

const navItems = [
  { to: "/", label: "Promotions", end: true },
  { to: "/marques", label: "Marques" },
  { to: "/categories", label: "Catégories" },
  { to: "/favoris", label: "Mes favoris" },
];

const mobileEditorialItems = [
  { to: "/comment-ca-marche", label: "Comment ça marche" },
  { to: "/a-propos", label: "À propos" },
  { to: "/faq", label: "FAQ" },
];

export function Header() {
  const { theme, toggleTheme, favorites } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Navigation principale">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              {item.label}
              {item.to === "/favoris" && favorites.length > 0 && (
                <span className="nav-count">{favorites.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="site-header__actions">
          <button
            className="icon-button header-icon"
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"
            }
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <NavLink
            to="/compte"
            className={({ isActive }) =>
              `account-entry${isActive ? " is-active" : ""}`
            }
            aria-label="Mon compte"
          >
            <UserRound size={19} />
            <span>Se connecter</span>
          </NavLink>
          <button
            className="icon-button mobile-menu-button"
            type="button"
            ref={mobileMenuButtonRef}
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="mobile-nav container" aria-label="Navigation mobile">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "is-active" : "")}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
              {item.to === "/favoris" && favorites.length > 0 && (
                <span>{favorites.length}</span>
              )}
            </NavLink>
          ))}
          <span className="mobile-nav__divider" aria-hidden="true" />
          {mobileEditorialItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "is-active" : "")}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
