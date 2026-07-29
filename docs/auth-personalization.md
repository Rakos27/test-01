# Comptes et personnalisation Dealyva

La page `/compte` actuelle est volontairement un prototype local. Elle permet
de tester le choix des marques et les recommandations sans créer de faux
compte distant. Le nom et l’adresse e-mail restent dans le navigateur et
peuvent être supprimés depuis cette page.

## Architecture recommandée

Pour disposer de vrais comptes synchronisés entre appareils, Dealyva peut
utiliser Supabase :

1. Supabase Auth avec connexion par lien magique envoyé par e-mail ;
2. une base Postgres pour les profils, marques suivies, favoris et vues ;
3. des politiques Row Level Security sur chaque table afin qu’un utilisateur
   ne lise et ne modifie que ses propres lignes ;
4. une migration unique du profil local après la première connexion ;
5. une action « supprimer mon compte et mes données » accessible dans
   l’espace utilisateur.

Les variables publiques attendues seront :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

La clé `service_role` ne doit jamais être placée dans le navigateur ni dans
une variable préfixée par `VITE_`.

## Modèle minimal

- `profiles` : `user_id`, `display_name`, `created_at`, `updated_at` ;
- `favorite_offers` : `user_id`, `offer_id`, `created_at` ;
- `followed_brands` : `user_id`, `brand_id`, `created_at` ;
- `offer_events` : `user_id`, `offer_id`, `event_type`, `created_at`.

Les recommandations peuvent commencer par un score explicable :

- marque suivie : +100 ;
- catégorie d’un favori : +60 ;
- catégorie récemment consultée : +40 ;
- offre nouvelle : +15.

Ce score est calculable sans profilage publicitaire externe. Les événements
doivent être limités à ce qui est réellement utile et documentés dans la
politique de confidentialité avant l’activation des comptes.

## Mise en œuvre

1. Créer le projet Supabase et configurer les URL de redirection locale et
   publique.
2. Créer les tables et activer RLS.
3. Installer `@supabase/supabase-js`.
4. Remplacer le formulaire local par le lien magique.
5. Synchroniser favoris et marques après authentification.
6. Ajouter export et suppression des données.
7. Tester deux comptes distincts pour vérifier l’isolation des données.

Documentation officielle :

- https://supabase.com/docs/guides/getting-started/tutorials/with-react
- https://supabase.com/docs/guides/database/postgres/row-level-security
