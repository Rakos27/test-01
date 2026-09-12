import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  Search,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { useApp } from "../context/AppContext";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const normaliseForSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");

export function BrandsPage() {
  const {
    brands,
    categories,
    promotions,
    selectedBrands,
    toggleBrand,
  } = useApp();
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const isDemoCatalog =
    promotions.length > 0 &&
    promotions.every((promotion) => promotion.source === "demo");

  const selectedBrandIds = useMemo(
    () => new Set(selectedBrands),
    [selectedBrands],
  );

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const offerCounts = useMemo(() => {
    const counts = new Map<string, number>();

    promotions.forEach((promotion) => {
      if (!promotion.isExpired) {
        counts.set(
          promotion.brandId,
          (counts.get(promotion.brandId) ?? 0) + 1,
        );
      }
    });

    return counts;
  }, [promotions]);

  const availableLetters = useMemo(
    () =>
      new Set(
        brands.map((brand) =>
          normaliseForSearch(brand.name).charAt(0).toUpperCase(),
        ),
      ),
    [brands],
  );

  const filteredBrands = useMemo(() => {
    const normalisedQuery = normaliseForSearch(query.trim());

    return [...brands]
      .filter((brand) => {
        const normalisedName = normaliseForSearch(brand.name);
        const matchesQuery =
          normalisedQuery.length === 0 ||
          normalisedName.includes(normalisedQuery);
        const matchesLetter =
          activeLetter === null ||
          normalisedName.charAt(0).toUpperCase() === activeLetter;

        return matchesQuery && matchesLetter;
      })
      .sort((first, second) =>
        first.name.localeCompare(second.name, "fr", { sensitivity: "base" }),
      );
  }, [activeLetter, brands, query]);

  const selectedBrandList = useMemo(
    () => brands.filter((brand) => selectedBrandIds.has(brand.id)),
    [brands, selectedBrandIds],
  );

  const selectVisibleBrands = () => {
    filteredBrands.forEach((brand) => {
      if (!selectedBrandIds.has(brand.id)) {
        toggleBrand(brand.id);
      }
    });
  };

  const clearSelection = () => {
    selectedBrands.forEach((brandId) => toggleBrand(brandId));
  };

  const resetSearch = () => {
    setQuery("");
    setActiveLetter(null);
  };

  return (
    <main className="page-shell catalog-page brands-page">
      <section className="catalog-hero" aria-labelledby="brands-title">
        <div className="catalog-hero__content">
          <p className="eyebrow">
            <Sparkles aria-hidden="true" size={16} />
            {isDemoCatalog ? "Marques fictives de démonstration" : "Annonceurs partenaires"}
          </p>
          <h1 id="brands-title">Vos marques, vos réductions.</h1>
          <p className="catalog-hero__intro">
            {isDemoCatalog
              ? "Testez la recherche, l’alphabet et votre sélection avec des marques clairement fictives."
              : "Composez votre sélection pour retrouver en un instant les offres qui comptent vraiment pour vous."}
          </p>
        </div>

        <dl className="catalog-hero__stats" aria-label="Aperçu du catalogue">
          <div>
            <dt>Marques</dt>
            <dd><AnimatedNumber value={brands.length} /></dd>
          </div>
          <div>
            <dt>Offres en cours</dt>
            <dd>
              <AnimatedNumber
                value={
                  promotions.filter((promotion) => !promotion.isExpired)
                    .length
                }
              />
            </dd>
          </div>
          <div>
            <dt>Dans votre sélection</dt>
            <dd><AnimatedNumber value={selectedBrands.length} /></dd>
          </div>
        </dl>
      </section>

      <section
        className="catalog-toolbar"
        aria-label="Rechercher et filtrer les marques"
      >
        <div className="catalog-search">
          <Search aria-hidden="true" size={20} />
          <label className="sr-only" htmlFor="brand-search">
            Rechercher une marque
          </label>
          <input
            id="brand-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une marque…"
            autoComplete="off"
          />
          {query && (
            <button
              className="icon-button"
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
            >
              <X aria-hidden="true" size={18} />
            </button>
          )}
        </div>

        <div className="catalog-toolbar__actions">
          <button
            className="button button--secondary"
            type="button"
            onClick={selectVisibleBrands}
            disabled={
              filteredBrands.length === 0 ||
              filteredBrands.every((brand) =>
                selectedBrandIds.has(brand.id),
              )
            }
          >
            <Check aria-hidden="true" size={17} />
            Tout sélectionner
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={clearSelection}
            disabled={selectedBrands.length === 0}
          >
            Tout effacer
          </button>
        </div>
      </section>

      <nav className="alphabet-filter" aria-label="Filtrer par initiale">
        <button
          type="button"
          className={activeLetter === null ? "is-active" : ""}
          aria-pressed={activeLetter === null}
          onClick={() => setActiveLetter(null)}
        >
          Toutes
        </button>
        {alphabet.map((letter) => (
          <button
            key={letter}
            type="button"
            className={activeLetter === letter ? "is-active" : ""}
            aria-pressed={activeLetter === letter}
            disabled={!availableLetters.has(letter)}
            onClick={() =>
              setActiveLetter((current) =>
                current === letter ? null : letter,
              )
            }
          >
            {letter}
          </button>
        ))}
      </nav>

      {selectedBrandList.length > 0 && (
        <section
          className="selection-summary"
          aria-labelledby="selected-brands-title"
        >
          <div className="selection-summary__heading">
            <div>
              <p className="eyebrow">Votre sélection</p>
              <h2 id="selected-brands-title">
                {selectedBrandList.length} marque
                {selectedBrandList.length > 1 ? "s" : ""} suivie
                {selectedBrandList.length > 1 ? "s" : ""}
              </h2>
            </div>
            <Link
              className="text-link"
              to={`/?marque=${selectedBrands.join(",")}`}
            >
              Voir les offres
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
          <div className="chip-list" aria-label="Marques sélectionnées">
            {selectedBrandList.map((brand) => (
              <button
                className="selection-chip"
                type="button"
                key={brand.id}
                onClick={() => toggleBrand(brand.id)}
                aria-label={`Retirer ${brand.name} de ma sélection`}
              >
                {brand.name}
                <X aria-hidden="true" size={15} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="catalog-results" aria-labelledby="brand-results-title">
        <div className="section-heading section-heading--inline">
          <div>
            <p className="eyebrow">De A à Z</p>
            <h2 id="brand-results-title">
              {filteredBrands.length} marque
              {filteredBrands.length > 1 ? "s" : ""}
            </h2>
          </div>
          <p aria-live="polite">
            {query
              ? `Résultats pour « ${query} »`
              : "Toutes les marques du catalogue"}
          </p>
        </div>

        {filteredBrands.length > 0 ? (
          <div className="brand-catalog-grid">
            {filteredBrands.map((brand) => {
              const isSelected = selectedBrandIds.has(brand.id);
              const offerCount = offerCounts.get(brand.id) ?? 0;

              return (
                <article
                  className={`brand-catalog-card${
                    isSelected ? " is-selected" : ""
                  }`}
                  key={brand.id}
                  style={
                    { "--brand-tone": brand.tone } as CSSProperties
                  }
                >
                  <button
                    className="brand-catalog-card__select"
                    type="button"
                    onClick={() => toggleBrand(brand.id)}
                    aria-pressed={isSelected}
                    aria-label={
                      isSelected
                        ? `Retirer ${brand.name} de ma sélection`
                        : `Ajouter ${brand.name} à ma sélection`
                    }
                  >
                    <span className="brand-mark" aria-hidden="true">
                      {brand.initials}
                    </span>
                    <span
                      className="brand-select-indicator"
                      aria-hidden="true"
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>

                  <div className="brand-catalog-card__body">
                    <p className="brand-catalog-card__category">
                      {categoryNames.get(brand.category)}
                    </p>
                    <h3>{brand.name}</h3>
                    <p>
                      {offerCount} offre{offerCount !== 1 ? "s" : ""} en cours
                    </p>
                  </div>

                  <Link
                    className="brand-catalog-card__link"
                    to={`/marque/${brand.id}`}
                    aria-label={`Découvrir la page ${brand.name}`}
                  >
                    Découvrir la marque
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Store aria-hidden="true" size={32} />
            <h3>Aucune marque trouvée</h3>
            <p>
              Essayez un autre nom ou revenez à l’ensemble du catalogue.
            </p>
            <button
              className="button button--secondary"
              type="button"
              onClick={resetSearch}
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}
      </section>

      <p className="source-disclaimer">
        {isDemoCatalog
          ? "Les noms et identités de marque affichés ici sont fictifs et servent uniquement à tester l’interface."
          : "Les marques restent la propriété de leurs titulaires. Les offres publiées proviennent des annonceurs approuvés via le réseau Awin."}
      </p>
    </main>
  );
}

export default BrandsPage;
