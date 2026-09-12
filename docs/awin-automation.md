# Automatisation Awin

## Ce qui est automatisé

- récupération périodique des programmes rejoints et en attente ;
- analyse déterministe de l’adéquation, du potentiel économique et du risque ;
- génération de `data/awin-opportunity-report.json` ;
- synchronisation des promotions des programmes rejoints ;
- récupération des flux produits configurés ;
- publication uniquement des offres déjà approuvées dans `data/awin-moderation.json` ;
- déploiement du catalogue après compilation et contrôles.

## Ce qui nécessite une validation humaine

L’outil ne peut pas accepter une invitation ou envoyer une demande à un annonceur
automatiquement. Ces actions engagent le compte Awin, peuvent accepter des
conditions commerciales et nécessitent parfois une vérification juridique.

Le rapport propose une priorité ; il ne constitue pas une décision automatique.
L’acceptation ou le refus se fait dans Awin, puis la prochaine synchronisation
met à jour le catalogue.

## Boucle recommandée

1. Le workflow génère le rapport des programmes.
2. Le propriétaire examine les recommandations « à accepter après revue humaine ».
3. Les invitations sont acceptées ou refusées dans Awin.
4. Le workflow suivant synchronise les programmes rejoints et les feeds produits.
5. Les nouvelles offres restent en attente de modération.
6. Après approbation dans le centre local, le flux public est déployé.

## Variables GitHub

- `AWIN_ACCESS_TOKEN` : secret Awin côté serveur ;
- `AWIN_PUBLISHER_ID` : identifiant Publisher ;
- `AWIN_PRODUCT_FEED_URL` : variable contenant l’URL Create-a-Feed d’un programme rejoint ;
- `ENABLE_DEMO_OFFERS=false` en production.