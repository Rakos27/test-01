/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { categories as catalogCategories } from "../data/categories";
import type {
  Brand,
  Category,
  Promotion,
  ToastMessage,
} from "../types";

export type Theme = "light" | "dark";
export type ToastTone = NonNullable<ToastMessage["tone"]>;

interface StoredAppState {
  theme: Theme;
  selectedBrands: string[];
  favorites: string[];
  recentlyViewed: string[];
  dismissedRecommendations: string[];
  promotions: Promotion[];
  brands: Brand[];
  lastUpdated: string;
}

interface StorageEnvelope {
  version: number;
  state: StoredAppState;
}

interface PromotionFeed {
  generatedAt: string | null;
  promotions: Promotion[];
}

export interface AppContextValue {
  hydrated: boolean;
  hasHydrated: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  selectedBrands: string[];
  toggleBrand: (id: string) => void;
  setSelectedBrands: (ids: string[]) => void;
  clearBrands: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  recentlyViewed: string[];
  recordView: (id: string) => void;
  dismissedRecommendations: string[];
  dismissRecommendation: (id: string) => void;
  promotions: Promotion[];
  brands: Brand[];
  categories: Category[];
  lastUpdated: string;
  isFeedLoading: boolean;
  isRefreshing: boolean;
  refreshOffers: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (
    message: string,
    tone?: ToastTone,
    duration?: number,
  ) => number;
  dismissToast: (id: number) => void;
}

const STORAGE_KEY = "dealyva:app-state";
const LEGACY_STORAGE_KEY = "offrely:app-state";
const STORAGE_VERSION = 3;
const MAX_RECENTLY_VIEWED = 20;
const DEFAULT_TOAST_DURATION = 3_600;

const AppContext = createContext<AppContextValue | undefined>(undefined);

function clonePromotions(items: readonly Promotion[]): Promotion[] {
  return items.map((promotion) => ({
    ...promotion,
    tags: [...promotion.tags],
    terms: [...promotion.terms],
    sizeOptions: promotion.sizeOptions?.map((size) => ({ ...size })),
  }));
}

function getPreferredTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function createDefaultState(): StoredAppState {
  return {
    theme: getPreferredTheme(),
    selectedBrands: [],
    favorites: [],
    recentlyViewed: [],
    dismissedRecommendations: [],
    promotions: [],
    brands: [],
    lastUpdated: new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isBrand(value: unknown): value is Brand {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.initials === "string" &&
    typeof value.tone === "string"
  );
}

function isPromotion(value: unknown): value is Promotion {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.brandId === "string" &&
    typeof value.brand === "string" &&
    typeof value.merchant === "string" &&
    typeof value.category === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.originalPrice === "number" &&
    Number.isFinite(value.originalPrice) &&
    typeof value.currentPrice === "number" &&
    Number.isFinite(value.currentPrice) &&
    typeof value.discount === "number" &&
    Number.isFinite(value.discount) &&
    typeof value.savings === "number" &&
    Number.isFinite(value.savings) &&
    typeof value.image === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.verifiedAt === "string" &&
    typeof value.createdAt === "string" &&
    (value.promoCode === undefined || typeof value.promoCode === "string") &&
    (value.isNew === undefined || typeof value.isNew === "boolean") &&
    (value.isExpired === undefined || typeof value.isExpired === "boolean") &&
    typeof value.onlineOnly === "boolean" &&
    isStringArray(value.terms) &&
    isStringArray(value.tags) &&
    (value.source === "awin" || value.source === "demo") &&
    (value.source === "demo" ||
      (typeof value.affiliateUrl === "string" &&
        /^https:\/\//i.test(value.affiliateUrl))) &&
    (value.sourceId === undefined || typeof value.sourceId === "string") &&
    (value.offerType === undefined ||
      value.offerType === "promotion" ||
      value.offerType === "voucher") &&
    (value.sizeGuide === undefined ||
      value.sizeGuide === "clothing" ||
      value.sizeGuide === "shoes") &&
    (value.sizeOptions === undefined ||
      (Array.isArray(value.sizeOptions) &&
        value.sizeOptions.every(
          (size) =>
            isRecord(size) &&
            typeof size.label === "string" &&
            (size.status === "discounted" ||
              size.status === "regular" ||
              size.status === "unavailable"),
        )))
  );
}

function buildInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("fr-FR") ?? "")
    .join("");

  return initials || "PA";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function deriveBrands(
  promotions: readonly Promotion[],
  storedBrands: readonly Brand[] = [],
): Brand[] {
  const previousBrands = new Map(
    storedBrands.map((brand) => [brand.id, brand]),
  );

  return [
    ...new Map(
      promotions.map((promotion) => {
        const previous = previousBrands.get(promotion.brandId);
        return [
          promotion.brandId,
          previous ?? {
            id: promotion.brandId,
            name: promotion.brand,
            category: promotion.category,
            initials: buildInitials(promotion.brand),
            tone: "#E24659",
          },
        ];
      }),
    ).values(),
  ];
}

function sanitizeStoredState(value: unknown): StoredAppState | null {
  if (!isRecord(value)) {
    return null;
  }

  const possibleState = isRecord(value.state) ? value.state : value;
  const promotions =
    Array.isArray(possibleState.promotions) &&
    possibleState.promotions.every(isPromotion)
      ? clonePromotions(possibleState.promotions).filter((promotion) => {
          const expiresAt = new Date(promotion.expiresAt).getTime();
          return Number.isFinite(expiresAt) && expiresAt > Date.now();
        })
      : [];
  const storedBrands =
    Array.isArray(possibleState.brands) &&
    possibleState.brands.every(isBrand)
      ? possibleState.brands
      : [];
  const brands = deriveBrands(promotions, storedBrands);
  const brandIds = new Set(brands.map((brand) => brand.id));
  const promotionIds = new Set(promotions.map((promotion) => promotion.id));

  return {
    theme:
      possibleState.theme === "dark" || possibleState.theme === "light"
        ? possibleState.theme
        : getPreferredTheme(),
    selectedBrands: isStringArray(possibleState.selectedBrands)
      ? uniqueStrings(possibleState.selectedBrands).filter((id) =>
          brandIds.has(id),
        )
      : [],
    favorites: isStringArray(possibleState.favorites)
      ? uniqueStrings(possibleState.favorites).filter((id) =>
          promotionIds.has(id),
        )
      : [],
    recentlyViewed: isStringArray(possibleState.recentlyViewed)
      ? uniqueStrings(possibleState.recentlyViewed)
          .filter((id) => promotionIds.has(id))
          .slice(0, MAX_RECENTLY_VIEWED)
      : [],
    dismissedRecommendations: isStringArray(
      possibleState.dismissedRecommendations,
    )
      ? uniqueStrings(possibleState.dismissedRecommendations).filter((id) =>
          promotionIds.has(id),
        )
      : [],
    promotions,
    brands,
    lastUpdated:
      typeof possibleState.lastUpdated === "string"
        ? possibleState.lastUpdated
        : new Date().toISOString(),
  };
}

function readStoredState(): StoredAppState {
  const fallback = createDefaultState();

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!rawValue) {
      return fallback;
    }

    return sanitizeStoredState(JSON.parse(rawValue)) ?? fallback;
  } catch {
    return fallback;
  }
}

function parsePromotionFeed(value: unknown): PromotionFeed | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.promotions) ||
    !value.promotions.every(isPromotion) ||
    new Set(value.promotions.map((promotion) => promotion.id)).size !==
      value.promotions.length
  ) {
    return null;
  }

  const now = Date.now();
  return {
    generatedAt:
      typeof value.generatedAt === "string" ? value.generatedAt : null,
    promotions: clonePromotions(value.promotions).filter((promotion) => {
      const expiresAt = new Date(promotion.expiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    }),
  };
}

function promotionFeedUrl(fileName = "promotions.json"): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}data/${fileName}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<StoredAppState>(readStoredState);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const refreshInProgress = useRef(false);
  const toastId = useRef(0);
  const toastTimers = useRef(new Map<number, number>());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = state.theme;
    root.classList.toggle("dark", state.theme === "dark");
    root.style.colorScheme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    const envelope: StorageEnvelope = {
      version: STORAGE_VERSION,
      state,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.localStorage.removeItem("dealyva:favorite-alerts");
      window.localStorage.removeItem("offrely:favorite-alerts");
    } catch {
      // Local storage is optional.
    }
  }, [state]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (event.newValue === null) {
        setState(createDefaultState());
        return;
      }

      try {
        const nextState = sanitizeStoredState(JSON.parse(event.newValue));
        if (nextState) {
          setState(nextState);
        }
      } catch {
        // Ignore invalid writes from another tab.
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (
      message: string,
      tone: ToastTone = "default",
      duration = DEFAULT_TOAST_DURATION,
    ) => {
      toastId.current += 1;
      const id = toastId.current;
      setToasts((current) => [
        ...current.slice(-3),
        { id, message, tone },
      ]);

      if (duration > 0) {
        const timer = window.setTimeout(
          () => dismissToast(id),
          Math.max(500, duration),
        );
        toastTimers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
      toastTimers.current.clear();
    },
    [],
  );

  const syncAwinPromotions = useCallback(async (signal?: AbortSignal) => {
    const fetchFeed = async (fileName: string) => {
      const response = await fetch(promotionFeedUrl(fileName), {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal,
      });

      if (!response.ok) {
        throw new Error(`Flux de promotions indisponible (${response.status})`);
      }

      const feed = parsePromotionFeed(await response.json());
      if (!feed) {
        throw new Error("Le flux de promotions est invalide");
      }
      return feed;
    };

    let feed: PromotionFeed | null = null;
    let liveFeedError: unknown = null;

    try {
      feed = await fetchFeed("promotions.json");
    } catch (error) {
      liveFeedError = error;
    }

    const demoEnabled = import.meta.env.VITE_ENABLE_DEMO_OFFERS !== "false";
    if (demoEnabled && (!feed || feed.promotions.length === 0)) {
      try {
        feed = await fetchFeed("demo-promotions.json");
      } catch {
        // Fall back to the empty live feed when the optional demo feed fails.
      }
    }

    if (!feed) {
      throw liveFeedError instanceof Error
        ? liveFeedError
        : new Error("Le flux de promotions est indisponible");
    }

    setState((current) => {
      const promotions = feed.promotions;
      const brands = deriveBrands(promotions, current.brands);
      const promotionIds = new Set(
        promotions.map((promotion) => promotion.id),
      );
      const brandIds = new Set(brands.map((brand) => brand.id));

      return {
        ...current,
        promotions,
        brands,
        selectedBrands: current.selectedBrands.filter((id) =>
          brandIds.has(id),
        ),
        favorites: current.favorites.filter((id) => promotionIds.has(id)),
        recentlyViewed: current.recentlyViewed.filter((id) =>
          promotionIds.has(id),
        ),
        dismissedRecommendations: current.dismissedRecommendations.filter(
          (id) => promotionIds.has(id),
        ),
        lastUpdated: feed.generatedAt ?? new Date().toISOString(),
      };
    });

    return {
      count: feed.promotions.length,
      isDemo:
        feed.promotions.length > 0 &&
        feed.promotions.every((promotion) => promotion.source === "demo"),
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    // The state update happens after the external feed request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncAwinPromotions(controller.signal)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Keep the last valid partner feed if the published feed is unavailable.
      })
      .finally(() => {
        if (active) {
          setIsFeedLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [syncAwinPromotions]);

  const setTheme = useCallback((theme: Theme) => {
    setState((current) => ({ ...current, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    }));
  }, []);

  const setSelectedBrands = useCallback((ids: string[]) => {
    setState((current) => {
      const validIds = new Set(current.brands.map((brand) => brand.id));
      return {
        ...current,
        selectedBrands: uniqueStrings(ids).filter((id) =>
          validIds.has(id),
        ),
      };
    });
  }, []);

  const toggleBrand = useCallback((id: string) => {
    setState((current) => {
      if (!current.brands.some((brand) => brand.id === id)) {
        return current;
      }

      return {
        ...current,
        selectedBrands: current.selectedBrands.includes(id)
          ? current.selectedBrands.filter((brandId) => brandId !== id)
          : [...current.selectedBrands, id],
      };
    });
  }, []);

  const clearBrands = useCallback(() => {
    setState((current) => ({ ...current, selectedBrands: [] }));
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      const isAdding = !state.favorites.includes(id);
      setState((current) => {
        if (!current.promotions.some((promotion) => promotion.id === id)) {
          return current;
        }

        return {
          ...current,
          favorites: current.favorites.includes(id)
            ? current.favorites.filter(
                (promotionId) => promotionId !== id,
              )
            : [id, ...current.favorites],
        };
      });
      showToast(
        isAdding ? "Offre ajoutée aux favoris" : "Offre retirée des favoris",
        isAdding ? "success" : "default",
      );
    },
    [showToast, state.favorites],
  );

  const recordView = useCallback((id: string) => {
    setState((current) => {
      if (!current.promotions.some((promotion) => promotion.id === id)) {
        return current;
      }

      return {
        ...current,
        recentlyViewed: [
          id,
          ...current.recentlyViewed.filter(
            (promotionId) => promotionId !== id,
          ),
        ].slice(0, MAX_RECENTLY_VIEWED),
      };
    });
  }, []);

  const dismissRecommendation = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      dismissedRecommendations: uniqueStrings([
        ...current.dismissedRecommendations,
        id,
      ]),
    }));
  }, []);

  const refreshOffers = useCallback(async () => {
    if (refreshInProgress.current) {
      return;
    }

    refreshInProgress.current = true;
    setIsRefreshing(true);

    try {
      const { count, isDemo } = await syncAwinPromotions();
      showToast(
        count > 0
          ? isDemo
            ? `Catalogue de démonstration actualisé (${count} scénarios fictifs)`
            : `${count} offre${count !== 1 ? "s" : ""} partenaire${count !== 1 ? "s" : ""} synchronisée${count !== 1 ? "s" : ""}`
          : "Flux Awin à jour : aucune offre approuvée pour le moment",
        "success",
      );
    } catch (error) {
      showToast("Impossible d’actualiser le flux Awin", "danger");
      throw error;
    } finally {
      refreshInProgress.current = false;
      setIsRefreshing(false);
    }
  }, [showToast, syncAwinPromotions]);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated: true,
      hasHydrated: true,
      theme: state.theme,
      setTheme,
      toggleTheme,
      selectedBrands: state.selectedBrands,
      toggleBrand,
      setSelectedBrands,
      clearBrands,
      favorites: state.favorites,
      toggleFavorite,
      recentlyViewed: state.recentlyViewed,
      recordView,
      dismissedRecommendations: state.dismissedRecommendations,
      dismissRecommendation,
      promotions: state.promotions,
      brands: state.brands,
      categories: catalogCategories,
      lastUpdated: state.lastUpdated,
      isFeedLoading,
      isRefreshing,
      refreshOffers,
      toasts,
      showToast,
      dismissToast,
    }),
    [
      clearBrands,
      dismissRecommendation,
      dismissToast,
      isFeedLoading,
      isRefreshing,
      recordView,
      refreshOffers,
      setSelectedBrands,
      setTheme,
      showToast,
      state,
      toasts,
      toggleBrand,
      toggleFavorite,
      toggleTheme,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp doit être utilisé dans un AppProvider.");
  }
  return context;
}
