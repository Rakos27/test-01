import type { PromotionFilters } from "../types";

export function getActiveFilterCount(filters: PromotionFilters) {
  return (
    filters.categories.length +
    filters.subcategories.length +
    filters.brands.length +
    Number(filters.minPrice !== null) +
    Number(filters.maxPrice !== null) +
    Number(filters.minDiscount > 0) +
    Number(filters.codeMode !== "all") +
    Number(filters.endingSoon) +
    Number(filters.newOnly) +
    Number(filters.selectedBrandsOnly)
  );
}
