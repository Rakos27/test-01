import { X } from "lucide-react";
import type { PromotionFilters } from "../types";
import { useApp } from "../context/AppContext";

interface ActiveFiltersProps {
  filters: PromotionFilters;
  onChange: (filters: PromotionFilters) => void;
}

export function ActiveFilters({ filters, onChange }: ActiveFiltersProps) {
  const { categories, brands } = useApp();
  const chips: { key: string; label: string; remove: () => void }[] = [];

  filters.categories.forEach((id) => {
    chips.push({
      key: `category-${id}`,
      label: categories.find((category) => category.id === id)?.name ?? id,
      remove: () =>
        onChange({
          ...filters,
          categories: filters.categories.filter((item) => item !== id),
        }),
    });
  });
  filters.subcategories.forEach((id) => {
    const labelMap: Record<string, string> = {
      "mode-femme": "Mode · Femme",
      "mode-homme": "Mode · Homme",
      "mode-enfants": "Mode · Enfants",
      "sous-vetements": "Sous-vêtements",
      "t-shirts": "T-shirts",
      "robes": "Robes",
      "jupes": "Jupes",
      "accessoires-femmes": "Accessoires femme",
      "pulls": "Pulls",
      "pantalons": "Pantalons",
      "manteaux": "Manteaux",
      "chaussures-enfants": "Chaussures enfants",
      "accessoires-enfants": "Accessoires enfants",
    };
    chips.push({
      key: `subcategory-${id}`,
      label: labelMap[id] ?? id,
      remove: () =>
        onChange({
          ...filters,
          subcategories: filters.subcategories.filter((item) => item !== id),
        }),
    });
  });
  filters.brands.forEach((id) => {
    chips.push({
      key: `brand-${id}`,
      label: brands.find((brand) => brand.id === id)?.name ?? id,
      remove: () =>
        onChange({
          ...filters,
          brands: filters.brands.filter((item) => item !== id),
        }),
    });
  });
  if (filters.minPrice !== null)
    chips.push({
      key: "min",
      label: `Dès ${filters.minPrice} €`,
      remove: () => onChange({ ...filters, minPrice: null }),
    });
  if (filters.maxPrice !== null)
    chips.push({
      key: "max",
      label: `Jusqu’à ${filters.maxPrice} €`,
      remove: () => onChange({ ...filters, maxPrice: null }),
    });
  if (filters.minDiscount)
    chips.push({
      key: "discount",
      label: `−${filters.minDiscount}% minimum`,
      remove: () => onChange({ ...filters, minDiscount: 0 }),
    });
  if (filters.codeMode !== "all")
    chips.push({
      key: "code",
      label: filters.codeMode === "with-code" ? "Avec code" : "Sans code",
      remove: () => onChange({ ...filters, codeMode: "all" }),
    });
  if (filters.endingSoon)
    chips.push({
      key: "ending",
      label: "Fin imminente",
      remove: () => onChange({ ...filters, endingSoon: false }),
    });
  if (filters.newOnly)
    chips.push({
      key: "new",
      label: "Nouveautés",
      remove: () => onChange({ ...filters, newOnly: false }),
    });
  if (filters.selectedBrandsOnly)
    chips.push({
      key: "mine",
      label: "Mes marques uniquement",
      remove: () => onChange({ ...filters, selectedBrandsOnly: false }),
    });

  if (!chips.length) return null;
  return (
    <div className="active-filters" aria-label="Filtres actifs">
      <span>Filtres actifs</span>
      {chips.map((chip) => (
        <button type="button" key={chip.key} onClick={chip.remove}>
          {chip.label} <X size={13} />
        </button>
      ))}
    </div>
  );
}
