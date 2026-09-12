import { Check, Heart, LogOut, Sparkles, UserRound } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";

interface LocalProfile {
  name: string;
  email: string;
}

const PROFILE_KEY = "dealyva:local-profile";

function readProfile(): LocalProfile | null {
  try {
    const value = window.localStorage.getItem(PROFILE_KEY);
    if (!value) return null;
    const profile = JSON.parse(value) as Partial<LocalProfile>;
    return typeof profile.name === "string" && typeof profile.email === "string"
      ? { name: profile.name, email: profile.email }
      : null;
  } catch {
    return null;
  }
}

export default function AccountPage() {
  const { brands, selectedBrands, toggleBrand, favorites, showToast } = useApp();
  const [profile, setProfile] = useState<LocalProfile | null>(readProfile);
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const suggestedBrands = useMemo(() => brands.slice(0, 12), [brands]);

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    const nextProfile = { name: name.trim(), email: email.trim().toLowerCase() };
    if (!nextProfile.name) {
      showToast("Indiquez un prénom ou un pseudo.", "danger");
      return;
    }
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    showToast("Profil enregistré sur cet appareil", "success");
  };

  const signOut = () => {
    window.localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
    setName("");
    setEmail("");
    showToast("Profil local supprimé");
  };

  return (
    <main className="account-page page-shell">
      <div className="container account-layout">
        <section className="account-intro">
          <span className="account-icon"><UserRound size={25} /></span>
          <span className="demo-badge">Prototype local</span>
          <span className="eyebrow">Votre espace Dealyva</span>
          <h1>{profile ? `Bonjour ${profile.name}` : "Créez votre profil local."}</h1>
          <p>
            Retrouvez vos marques, vos favoris et des recommandations adaptées
            à ce que vous consultez. Ce prototype prépare le futur compte
            sécurisé, sans prétendre vous connecter en ligne.
          </p>
          <div className="account-stats">
            <span><Heart size={17} /><strong>{favorites.length}</strong> favori{favorites.length !== 1 ? "s" : ""}</span>
            <span><Sparkles size={17} /><strong>{selectedBrands.length}</strong> marque{selectedBrands.length !== 1 ? "s" : ""} suivie{selectedBrands.length !== 1 ? "s" : ""}</span>
          </div>
        </section>

        <section className="account-card">
          <div>
            <span className="eyebrow">{profile ? "Mes informations locales" : "Profil sur cet appareil"}</span>
            <h2>{profile ? "Votre profil local" : "Commençons par vous connaître"}</h2>
          </div>
          <form onSubmit={saveProfile} className="account-form">
            <label>
              <span>Prénom ou pseudo</span>
              <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Camille" />
            </label>
            <label>
              <span>Adresse e-mail</span>
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="camille@exemple.fr" />
            </label>
            <button className="button button--primary" type="submit">
              <Check size={17} /> {profile ? "Mettre à jour" : "Créer mon profil local"}
            </button>
          </form>
          <p className="account-privacy">
            Version actuelle : ces informations restent uniquement dans ce
            navigateur. Il ne s’agit pas encore d’un compte : aucun mot de
            passe n’est demandé et rien n’est synchronisé entre vos appareils.
          </p>
          {profile && (
            <button type="button" className="account-signout" onClick={signOut}>
              <LogOut size={15} /> Supprimer ce profil de l’appareil
            </button>
          )}
        </section>

        <section className="account-preferences">
          <span className="eyebrow">Personnaliser mes recommandations</span>
          <h2>Quelles marques aimez-vous ?</h2>
          <p>Sélectionnez-en plusieurs : le flux recommandé évoluera immédiatement.</p>
          <div className="preference-brands">
            {suggestedBrands.map((brand) => {
              const selected = selectedBrands.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  type="button"
                  className={selected ? "is-selected" : ""}
                  onClick={() => toggleBrand(brand.id)}
                  aria-pressed={selected}
                >
                  <span style={{ background: brand.tone }}>{brand.initials}</span>
                  {brand.name}
                  {selected && <Check size={15} />}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
