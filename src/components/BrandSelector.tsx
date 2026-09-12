import {
  Check,
  CheckCheck,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApp } from "../context/AppContext";

interface BrandSelectorProps {
  selectedOnly?: boolean;
  onSelectedOnlyChange?: (value: boolean) => void;
  large?: boolean;
}

export function BrandSelector({
  selectedOnly = false,
  onSelectedOnlyChange,
  large = false,
}: BrandSelectorProps) {
  const {
    brands,
    promotions,
    selectedBrands,
    toggleBrand,
    setSelectedBrands,
    clearBrands,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const offerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    promotions.forEach((promotion) => {
      if (!promotion.isExpired) {
        counts.set(promotion.brandId, (counts.get(promotion.brandId) ?? 0) + 1);
      }
    });
    return counts;
  }, [promotions]);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("fr");
    return brands
      .filter((brand) => brand.name.toLocaleLowerCase("fr").includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .slice(0, 250);
  }, [brands, deferredSearch]);

  const groups = useMemo(() => {
    return filtered.reduce<Record<string, typeof filtered>>((result, brand) => {
      const letter = brand.name.charAt(0).toUpperCase();
      (result[letter] ??= []).push(brand);
      return result;
    }, {});
  }, [filtered]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const selectedBrandObjects = brands.filter((brand) =>
    selectedBrands.includes(brand.id),
  );

  return (
    <div
      className={`brand-selector ${large ? "brand-selector--large" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        ref={triggerRef}
        className={large ? "button button--primary button--hero" : "selector-trigger"}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {large ? <CheckCheck size={19} /> : <SlidersHorizontal size={17} />}
        {selectedBrands.length
          ? `${selectedBrands.length} marque${selectedBrands.length > 1 ? "s" : ""} choisie${selectedBrands.length > 1 ? "s" : ""}`
          : "Choisir mes marques"}
        <ChevronDown size={16} className={open ? "is-rotated" : ""} />
      </button>
      {open && (
        <div className="brand-menu" role="dialog" aria-modal="true" aria-label="Sélectionner des marques">
          <div className="brand-menu__header">
            <div>
              <span className="eyebrow">Votre sélection</span>
              <strong>Quelles marques aimez-vous ?</strong>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
          <label className="brand-menu__search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Rechercher une marque</span>
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher parmi les marques…"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Effacer">
                <X size={15} />
              </button>
            )}
          </label>
          <div className="brand-menu__toolbar">
            <button
              type="button"
              onClick={() => setSelectedBrands(filtered.map((brand) => brand.id))}
            >
              Tout sélectionner
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={clearBrands}>
              Tout effacer
            </button>
            <span className="brand-menu__count">
              {selectedBrands.length}/{brands.length}
            </span>
          </div>
          {selectedBrandObjects.length > 0 && (
            <div className="brand-menu__pills" aria-label="Marques sélectionnées">
              {selectedBrandObjects.slice(0, 8).map((brand) => (
                <button
                  type="button"
                  key={brand.id}
                  className="selection-pill"
                  onClick={() => toggleBrand(brand.id)}
                >
                  {brand.name} <X size={13} />
                </button>
              ))}
              {selectedBrandObjects.length > 8 && (
                <span className="more-pill">+{selectedBrandObjects.length - 8}</span>
              )}
            </div>
          )}
          <div className="brand-menu__list">
            {Object.entries(groups).map(([letter, group]) => (
              <div className="brand-group" key={letter}>
                <span className="brand-group__letter">{letter}</span>
                <div>
                  {group.map((brand) => {
                    const checked = selectedBrands.includes(brand.id);
                    const count = offerCounts.get(brand.id) ?? 0;
                    return (
                      <label
                        className={`brand-option ${checked ? "is-selected" : ""}`}
                        key={brand.id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBrand(brand.id)}
                        />
                        <span
                          className="brand-avatar"
                          style={{ background: brand.tone }}
                          aria-hidden="true"
                        >
                          {brand.initials}
                        </span>
                        <span className="brand-option__name">{brand.name}</span>
                        <small>
                          {count} offre{count > 1 ? "s" : ""}
                        </small>
                        <span className="fake-checkbox" aria-hidden="true">
                          {checked && <Check size={13} />}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {!filtered.length && (
              <div className="brand-menu__empty">
                Aucune marque ne correspond à « {search} ».
              </div>
            )}
          </div>
          <div className="brand-menu__footer">
            <label className="switch-row">
              <span>
                <strong>Afficher uniquement mes marques</strong>
                <small>Masquer les autres offres du flux</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={selectedOnly}
                onChange={(event) => onSelectedOnlyChange?.(event.target.checked)}
              />
            </label>
            <button
              type="button"
              className="button button--dark"
              onClick={() => setOpen(false)}
            >
              Voir ma sélection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
