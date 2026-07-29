import { Link, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AdSenseProvider } from "./components/AdSense";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MotionController } from "./components/MotionController";
import { SeoMetadata } from "./components/SeoMetadata";
import { ScrollToTop } from "./components/ScrollToTop";
import { ToastRegion } from "./components/ToastRegion";
import BrandDetailPage from "./screens/BrandDetailPage";
import BrandsPage from "./screens/BrandsPage";
import CategoriesPage from "./screens/CategoriesPage";
import CookiesPage from "./screens/CookiesPage";
import FaqPage from "./screens/FaqPage";
import FavoritesPage from "./screens/FavoritesPage";
import HomePage from "./screens/HomePage";
import HowItWorksPage from "./screens/HowItWorksPage";
import LegalPage from "./screens/LegalPage";
import AboutPage from "./screens/AboutPage";
import PrivacyPage from "./screens/PrivacyPage";
import PromotionDetailPage from "./screens/PromotionDetailPage";
import TermsPage from "./screens/TermsPage";
import AccountPage from "./screens/AccountPage";

function PublicLayout() {
  const { pathname, search } = useLocation();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <Header />
      <div id="main-content">
        <MotionController />
        <div className="route-stage" key={`${pathname}${search}`}>
          <Outlet />
        </div>
      </div>
      <Footer />
    </>
  );
}

function NotFoundPage() {
  return (
    <main className="page-shell container">
      <div className="empty-state standalone-empty">
        <span className="error-code">404</span>
        <h1>Cette page s’est égarée.</h1>
        <p>Revenez au flux pour retrouver les meilleures offres partenaires.</p>
        <Link className="button button--dark" to="/">
          Retourner à l’accueil
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <>
      <SeoMetadata />
      <AdSenseProvider />
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="marques" element={<BrandsPage />} />
          <Route path="marque/:brandId" element={<BrandDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="favoris" element={<FavoritesPage />} />
          <Route path="compte" element={<AccountPage />} />
          <Route path="offre/:id" element={<PromotionDetailPage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route path="comment-ca-marche" element={<HowItWorksPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="mentions-legales" element={<LegalPage />} />
          <Route path="conditions-utilisation" element={<TermsPage />} />
          <Route path="confidentialite" element={<PrivacyPage />} />
          <Route path="cookies" element={<CookiesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <ToastRegion />
    </>
  );
}
