import { Cookie } from "lucide-react";
import {
  adSenseEnabled,
  openAdPrivacySettings,
} from "../components/AdSense";
import { EditorialPage } from "../components/EditorialPage";
import { legalLastUpdated } from "../config/legal";

export default function CookiesPage() {
  return (
    <EditorialPage
      eyebrow="Traceurs et préférences"
      icon={Cookie}
      title="Politique relative aux cookies"
      intro={`Dealyva limite les traceurs et distingue les préférences fonctionnelles du suivi publicitaire. Dernière mise à jour : ${legalLastUpdated}.`}
    >
      <section className="legal-document">
        <h2>1. Stockage fonctionnel Dealyva</h2>
        <p>
          Le site utilise le stockage local de votre navigateur, et non un
          compte distant, pour conserver le thème, les favoris, les marques
          choisies, l’historique récent, le catalogue et le profil local que
          vous choisissez éventuellement de créer. Ces éléments servent
          uniquement au fonctionnement et à la personnalisation demandée du
          service et ne sont pas synchronisés entre appareils.
        </p>

        <h2>2. Mesure d’audience</h2>
        <p>
          Dealyva n’intègre actuellement aucun outil autonome de mesure
          d’audience. Cette politique sera mise à jour avant l’ajout éventuel
          d’un tel outil.
        </p>

        <h2>3. Affiliation</h2>
        <p>
          Aucun traceur Awin n’est déposé par l’interface Dealyva avant votre
          clic. Lorsque vous choisissez une offre, le lien affilié vous
          redirige vers Awin puis vers le marchand. Ces services peuvent alors
          déposer ou lire des traceurs selon leurs politiques et vos choix.
        </p>

        <h2>4. Publicité</h2>
        <p>
          Si les annonces Google sont activées, les traceurs publicitaires sont
          gérés par le mécanisme de consentement Google dans les territoires
          concernés. Refuser les traceurs non nécessaires doit rester aussi
          simple que les accepter.
        </p>
        {adSenseEnabled && (
          <button
            className="button button--outline"
            type="button"
            onClick={openAdPrivacySettings}
          >
            Gérer mes choix publicitaires
          </button>
        )}

        <h2>5. Modifier ou supprimer vos choix</h2>
        <p>
          Vous pouvez effacer le stockage de Dealyva et les cookies tiers depuis
          les réglages de votre navigateur. Si la publicité est active, le lien
          « Gérer mes choix publicitaires » reste aussi disponible dans le pied
          de page.
        </p>

        <h2>6. Durées</h2>
        <p>
          Les préférences locales persistent jusqu’à leur mise à jour ou leur
          suppression par vos soins. Les durées des traceurs Awin, Google et
          marchands sont indiquées dans leurs propres politiques ou dans
          l’interface de gestion du consentement.
        </p>
      </section>
    </EditorialPage>
  );
}
