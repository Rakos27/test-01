export type CategoryId =
  | "mode"
  | "sport"
  | "beaute"
  | "high-tech"
  | "gaming"
  | "maison"
  | "alimentation"
  | "voyage";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  eyebrow: string;
  image: string;
  accent: string;
}

export interface Brand {
  id: string;
  name: string;
  category: CategoryId;
  initials: string;
  tone: string;
}

export interface PromotionSizeOption {
  label: string;
  status: "discounted" | "regular" | "unavailable";
}

export interface Promotion {
  id: string;
  brandId: string;
  brand: string;
  merchant: string;
  category: CategoryId;
  title: string;
  productTitle?: string;
  description: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  savings: number;
  image: string;
  expiresAt: string;
  verifiedAt: string;
  createdAt: string;
  promoCode?: string;
  isNew?: boolean;
  isExpired?: boolean;
  onlineOnly: boolean;
  terms: string[];
  tags: string[];
  source?: "awin" | "demo";
  sourceId?: string;
  affiliateUrl?: string;
  productUrl?: string;
  offerType?: "promotion" | "voucher";
  sizeGuide?: "clothing" | "shoes";
  sizeOptions?: PromotionSizeOption[];
}

export type SortOption =
  | "recommended"
  | "recent"
  | "discount"
  | "price-asc"
  | "price-desc"
  | "ending";

export interface PromotionFilters {
  query: string;
  categories: CategoryId[];
  subcategories: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minDiscount: number;
  codeMode: "all" | "with-code" | "without-code";
  endingSoon: boolean;
  newOnly: boolean;
  onlineOnly: boolean;
  selectedBrandsOnly: boolean;
  sort: SortOption;
}

export interface ToastMessage {
  id: number;
  message: string;
  tone?: "default" | "success" | "danger";
}
