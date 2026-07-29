import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { EditorialPage } from "../components/EditorialPage";
import { legalConfig, legalLastUpdated } from "../config/legal";

export default function PrivacyPage() {
  return (
    <EditorialPage
      eyebrow="Vos données"
      icon={ShieldCheck}
      title="Politique de confidentialité"
      intro={`Cette page explique les données utilisées lorsque vous consultez Dealyva et les choix dont vous disposez. Dernière mise à jour : ${legalLastUpdated}.`}
    >
      <section className="legal-document">
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable des traitements propres à Dealyva est l’éditeur
          identifié dans les{" "}
          <Link className="text-link" to="/mentions-legales">
            mentions légales
          </Link>
          . Le contact dédié est{" "}
          {legalConfig.contactEmail ? (
            <a className="text-link" href={`mailto:${legalConfig.contactEmail}`}>
              {legalConfig.contactEmail}
            </a>
          ) : (
            "en cours de configuration"
          )}
          .
        </p>

        <h2>2. Données conservées dans votre navigateur</h2>
        <p>
          Dealyva utilise le stockage local pour mémoriser le thème, les marques
          sélectionnées, les favoris, les offres récemment consultées, les
          recommandations masquées, la dernière copie valide du catalogue et,
          si vous créez volontairement un profil local, le nom et l’adresse
          électronique saisis. Ces informations restent sur votre appareil et
          ne sont pas envoyées à Dealyva.
        </p>
        <p>
          Ce stockage est utilisé pour fournir les fonctionnalités demandées et
          conserver vos préférences. Il demeure jusqu’à son remplacement ou sa
          suppression depuis les réglages de votre navigateur.
        </p>

        <h2>3. Données techniques d’hébergement</h2>
        <p>
          Comme tout service en ligne, l’hébergeur peut traiter des données
          techniques telles que l’adresse IP, la date de requête, le navigateur
          et les journaux de sécurité afin de servir et protéger le site. Ces
          traitements relèvent également de la politique de l’hébergeur.
        </p>

        <h2>4. Liens affiliés Awin</h2>
        <p>
          Lorsque vous ouvrez une offre, vous quittez Dealyva via un lien
          affilié Awin. Awin, le marchand et leurs prestataires peuvent alors
          traiter des identifiants de clic et des données techniques pour
          attribuer une éventuelle transaction, prévenir la fraude et produire
          des statistiques, conformément à leurs propres politiques.
        </p>

        <h2>5. Publicité Google</h2>
        <p>
          Si Google AdSense est activé, Google et ses partenaires peuvent
          utiliser des traceurs pour diffuser et mesurer des annonces. Dans les
          régions où cela est requis, ces traceurs publicitaires ne sont
          utilisés qu’après vos choix recueillis par une plateforme de gestion
          du consentement certifiée par Google.
        </p>

        <h2>6. Destinataires et transferts</h2>
        <p>
          Les données locales ne sont pas reçues par Dealyva. Les données
          techniques ou de suivi éventuellement traitées par GitHub, Awin,
          Google ou les marchands peuvent être accessibles à leurs
          sous-traitants et transférées hors de l’Espace économique européen
          selon les garanties décrites dans leurs politiques respectives.
        </p>

        <h2>7. Vos droits</h2>
        <p>
          Selon le traitement concerné, vous pouvez demander l’accès, la
          rectification, l’effacement, la limitation ou l’opposition, et retirer
          votre consentement à tout moment lorsqu’il constitue la base du
          traitement. Vous pouvez aussi introduire une réclamation auprès de la{" "}
          <a
            className="text-link"
            href="https://www.cnil.fr/fr/plaintes"
            target="_blank"
            rel="noopener noreferrer"
          >
            CNIL
          </a>
          .
        </p>

        <h2>8. Exercer vos choix</h2>
        <p>
          Vous pouvez effacer les données locales depuis les paramètres de votre
          navigateur ou supprimer le profil depuis la page « Mon compte ». Pour
          une demande concernant Dealyva, utilisez le contact indiqué ci-dessus.
          Pour un traitement effectué après redirection, contactez également le
          marchand ou le prestataire concerné.
        </p>
      </section>
    </EditorialPage>
  );
}
