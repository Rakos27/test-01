import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useEffect } from "react";
import type { CategoryId, PromotionFilters } from "../types";
import { useApp } from "../context/AppContext";
import { getActiveFilterCount } from "../lib/filters";

const modeSubcategories = [
  {
    id: "mode-femme",
    label: "Vêtements femme",
    children: [
      { id: "sous-vetements", label: "Sous-vêtements" },
      { id: "t-shirts", label: "T-shirts" },
      { id: "robes", label: "Robes" },
      { id: "jupes", label: "Jupes" },
      { id: "accessoires-femmes", label: "Accessoires" },
    ],
  },
  {
    id: "mode-homme",
    label: "Vêtements homme",
    children: [
      { id: "t-shirts", label: "T-shirts" },
      { id: "pantalons", label: "Pantalons" },
      { id: "pulls", label: "Pulls" },
      { id: "manteaux", label: "Manteaux" },
    ],
  },
  {
    id: "mode-enfants",
    label: "Enfants",
    children: [
      { id: "chaussures-enfants", label: "Chaussures" },
      { id: "accessoires-enfants", label: "Accessoires" },
      { id: "t-shirts", label: "T-shirts" },
    ],
  },
];

interface FilterPanelProps {
  filters: PromotionFilters;
  onChange: (filters: PromotionFilters) => void;
  onReset: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function FilterPanel({
  filters,
  onChange,
  onReset,
  mobileOpen,
  onMobileClose,
}: FilterPanelProps) {
  const { categories, brands } = useApp();
  const activeCount = getActiveFilterCount(filters);
  const priceRangeInvalid =
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.minPrice > filters.maxPrice;

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen, onMobileClose]);

  const patch = (value: Partial<PromotionFilters>) =>
    onChange({ ...filters, ...value });

  const toggleCategory = (category: CategoryId) => {
    patch({
      categories: filters.categories.includes(category)
        ? filters.categories.filter((item) => item !== category)
        : [...filters.categories, category],
    });
  };

  const toggleSubcategory = (subcategory: string) => {
    const hasSelected = filters.subcategories.includes(subcategory);
    const nextSubcategories = hasSelected
      ? filters.subcategories.filter((item) => item !== subcategory)
      : [...filters.subcategories, subcategory];

    const nextCategories = new Set<CategoryId>(filters.categories);
    if (nextSubcategories.length > 0) {
      nextCategories.add("mode");
    } else {
      nextCategories.delete("mode");
    }

    patch({
      subcategories: nextSubcategories,
      categories: [...nextCategories],
    });
  };

  const toggleBrand = (brandId: string) => {
    patch({
      brands: filters.brands.includes(brandId)
        ? filters.brands.filter((item) => item !== brandId)
        : [...filters.brands, brandId],
    });
  };

  return (
    <>
      {mobileOpen && (
        <button
          className="filter-backdrop"
          type="button"
          onClick={onMobileClose}
          aria-label="Fermer les filtres"
        />
      )}
      <aside
        className={`filter-panel ${mobileOpen ? "filter-panel--mobile-open" : ""}`}
        aria-label="Filtres des promotions"
      >
        <div className="filter-panel__header">
          <span>
            <SlidersHorizontal size={18} />
            <strong>Filtres</strong>
            {activeCount > 0 && <small>{activeCount}</small>}
          </span>
          <button
            className="filter-panel__mobile-close"
            type="button"
            onClick={onMobileClose}
            aria-label="Fermer"
          >
            <X size={19} />
          </button>
          {activeCount > 0 && (
            <button type="button" onClick={onReset}>
              <RotateCcw size={14} /> Réinitialiser
            </button>
          )}
        </div>

        <details className="filter-group" open>
          <summary>Catégories</summary>
          <div className="filter-options">
            {categories.filter((category) => category.id !== "mode").map((category) => (
              <label key={category.id}>
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>

          <div className="filter-category-tree">
            <div className="filter-category-group">
              <label className="filter-category-parent">
                <input
                  type="checkbox"
                  checked={filters.categories.includes("mode")}
                  onChange={() => toggleCategory("mode")}
                />
                <span>Mode</span>
              </label>

              <div className="filter-category-children">
                {modeSubcategories.map((group) => (
                  <div className="filter-category-row" key={group.id}>
                    <label className="filter-category-child">
                      <input
                        type="checkbox"
                        checked={filters.subcategories.includes(group.id)}
                        onChange={() => toggleSubcategory(group.id)}
                      />
                      <span>{group.label}</span>
                    </label>

                    {group.children.length > 0 && (
                      <div className="filter-subcategory-list">
                        {group.children.map((leaf) => (
                          <label key={leaf.id} className="filter-subcategory-item">
                            <input
                              type="checkbox"
                              checked={filters.subcategories.includes(leaf.id)}
                              onChange={() => toggleSubcategory(leaf.id)}
                            />
                            <span>{leaf.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>

        <details className="filter-group">
          <summary>Marques</summary>
          <div className="filter-options filter-options--scroll">
            {brands.slice(0, 40).map((brand) => (
              <label key={brand.id}>
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand.id)}
                  onChange={() => toggleBrand(brand.id)}
                />
                <span>{brand.name}</span>
              </label>
            ))}
          </div>
        </details>

        <details className="filter-group" open>
          <summary>Fourchette de prix</summary>
          <div className="price-range">
            <label>
              <span>Minimum</span>
              <span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  aria-invalid={priceRangeInvalid}
                  value={filters.minPrice ?? ""}
                  onChange={(event) =>
                    patch({
                      minPrice: event.target.value
                        ? Math.max(0, Number(event.target.value))
                        : null,
                    })
                  }
                />
                €
              </span>
            </label>
            <span aria-hidden="true">—</span>
            <label>
              <span>Maximum</span>
              <span>
                <input
                  type="number"
                  min="0"
                  placeholder="500"
                  aria-invalid={priceRangeInvalid}
                  value={filters.maxPrice ?? ""}
                  onChange={(event) =>
                    patch({
                      maxPrice: event.target.value
                        ? Math.max(0, Number(event.target.value))
                        : null,
                    })
                  }
                />
                €
              </span>
            </label>
          </div>
          {priceRangeInvalid && (
            <p className="field-error" role="alert">
              Le maximum doit être supérieur ou égal au minimum.
            </p>
          )}
        </details>

        <details className="filter-group" open>
          <summary>Réduction minimale</summary>
          <div className="discount-options">
            {[0, 20, 30, 40, 50].map((discount) => (
              <button
                type="button"
                key={discount}
                className={filters.minDiscount === discount ? "is-active" : ""}
                onClick={() => patch({ minDiscount: discount })}
              >
                {discount === 0 ? "Toutes" : `−${discount}%`}
              </button>
            ))}
          </div>
        </details>

        <details className="filter-group" open>
          <summary>Type de promotion</summary>
          <div className="radio-stack">
            {[
              ["all", "Toutes les offres"],
              ["with-code", "Avec code"],
              ["without-code", "Sans code"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="code-mode"
                  checked={filters.codeMode === value}
                  onChange={() =>
                    patch({
                      codeMode: value as PromotionFilters["codeMode"],
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </details>

        <div className="filter-switches">
          <label className="switch-row">
            <span>
              <strong>Se terminent bientôt</strong>
              <small>Dans moins de 4 jours</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={filters.endingSoon}
              onChange={(event) => patch({ endingSoon: event.target.checked })}
            />
          </label>
          <label className="switch-row">
            <span>
              <strong>Nouveautés</strong>
              <small>Ajoutées récemment</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={filters.newOnly}
              onChange={(event) => patch({ newOnly: event.target.checked })}
            />
          </label>
          <label className="switch-row">
            <span>
              <strong>Disponible en ligne</strong>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={filters.onlineOnly}
              onChange={(event) => patch({ onlineOnly: event.target.checked })}
            />
          </label>
        </div>
        <button
          type="button"
          className="button button--primary filter-panel__apply"
          onClick={onMobileClose}
        >
          Appliquer les filtres
        </button>
      </aside>
    </>
  );
}
