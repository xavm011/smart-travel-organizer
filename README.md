# Smart Travel Organizer

MVP web responsive pour centraliser un voyage : destination et dates, réservations de vol, hôtel ou activité, import de texte/email ou PDF, vérification avant sauvegarde, chronologie, prochaines étapes, liens cartographiques et programme quotidien personnalisable.

## Démarrer en 2 minutes

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Sans variables d’environnement, l’application est immédiatement utilisable en **mode local**. Les données sont conservées dans le stockage de ce navigateur et ne sont pas synchronisées. L’import utilise une extraction simple, puis vous pouvez corriger les champs.

## Activer un espace privé synchronisé

1. Créez un projet [Supabase](https://supabase.com/).
2. Exécutez [`supabase/schema.sql`](supabase/schema.sql) dans le SQL Editor. Les tables ont des règles d’accès par utilisateur.
3. Dans Supabase Auth, activez l’email et configurez l’URL du site ainsi que l’URL de redirection (`http://localhost:3000` en local, puis votre URL de production). Les liens de connexion par email nécessitent un service d’envoi configuré pour un usage public.
4. Copiez `.env.example` vers `.env.local` et renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` depuis Supabase Project Settings → API.
5. Redémarrez le serveur. L’application demandera une connexion par email.

Le mode local ne migre pas automatiquement vers Supabase : exportez les informations utiles à la main avant de passer au mode synchronisé.

Pour un projet Supabase créé avant l’ajout des itinéraires, exécutez [`supabase/migrations/20261107_itineraries.sql`](supabase/migrations/20261107_itineraries.sql) dans le SQL Editor. Les nouveaux projets utilisent directement le schéma complet.

## Créer un itinéraire

Dans un voyage, ouvrez **Itinéraire** puis **Créer un itinéraire**. Choisissez un rythme repos, équilibré ou actif. L’application propose un programme pour chaque jour, place les réservations existantes et réserve du temps pour les trajets et les pauses. Vous pouvez changer le rythme et recréer le programme. Après une modification des réservations, un message vous invite à le régénérer.

La génération fonctionne aussi sans clé IA et ne consomme aucun appel API. Des lieux précis sont proposés pour Marrakech ; pour les villes non couvertes ou inconnues, le programme indique ce qui reste à choisir. Les visites suggérées ne sont pas réservées. Vérifiez toujours horaires, billets et trajets.

Les visites de Marrakech ont une photo à côté du programme. Les photos viennent de Wikimedia Commons ; chaque carte affiche son auteur et sa licence, et la liste complète figure dans [`public/attractions/credits.json`](public/attractions/credits.json). Les autres étapes utilisent une illustration par catégorie : aucune photo générique n’est présentée comme celle d’un hôtel réservé.

Le lien **Activités sur Booking.com** ouvre la page des visites liées au lieu lorsque Booking.com en propose une, ou la page des attractions de Marrakech. L’application n’est pas connectée à l’inventaire de Booking.com et n’affiche ni prix ni disponibilité ; la réservation éventuelle se fait sur Booking.com.

Entre deux étapes connues à Marrakech, le programme affiche une durée approximative à pied et en taxi. Les boutons ouvrent le trajet correspondant dans Google Maps pour obtenir un calcul réel. Les estimations locales reposent sur des positions de lieux issues d’[OpenStreetMap](https://www.openstreetmap.org/copyright) et affichées par [Mapcarta](https://mapcarta.com/) ; elles ne tiennent pas compte des rues, des embouteillages ou du point exact où un taxi peut s’arrêter. Si un lieu n’a pas de position suffisamment précise, l’application affiche seulement les liens vers la carte. Aucun appel payant à une API cartographique n’est nécessaire.

## Activer l’extraction IA (optionnelle)

Renseignez `OPENAI_API_KEY` côté serveur. L’IA ne fonctionne qu’en mode Supabase, avec un utilisateur authentifié. `OPENAI_MODEL` vaut `gpt-4.1-mini` par défaut et peut être modifié. Le serveur limite l’import à **10 appels IA par utilisateur et par jour**, 5 Mo par PDF, 25 000 caractères par import, avec un délai maximal de 15 secondes. Si l’IA est absente ou échoue, l’extraction simple reste disponible. L’utilisateur vérifie toujours les champs avant sauvegarde.

Les PDF doivent contenir du texte sélectionnable : la V1 ne fait pas d’OCR. Les documents originaux ne sont pas stockés ; leur texte est extrait en mémoire lors de la requête. Avec l’IA activée, ce texte est envoyé à l’API OpenAI. Aucune clé secrète n’est envoyée au navigateur.

## Vérifier

```bash
npm run typecheck
npm run lint
npm run build
```

Parcours manuel : créer un voyage → ajouter une réservation → ouvrir la chronologie et les prochaines étapes → créer un itinéraire dans les trois rythmes → changer une réservation et régénérer → importer une confirmation → corriger les champs → enregistrer → ouvrir l’adresse sur une carte → supprimer la réservation et le voyage.

## Publier

Poussez ce dossier dans un dépôt GitHub. Dans Vercel, importez le dépôt et ajoutez les mêmes variables d’environnement. Exécutez le schéma SQL dans Supabase et ajoutez le domaine Vercel aux URL Auth. Un déploiement sans Supabase reste un mode local propre à chaque navigateur ; la synchronisation nécessite Supabase. Ne mettez jamais `.env.local` ni une clé `service_role` sur GitHub.

## Périmètre de la V1

La V1 contient la saisie et la suppression, l’import assisté, la consultation et un itinéraire quotidien. Elle n’inclut pas les réservations automatiques, la lecture de boîte mail, les cartes intégrées, l’OCR, le partage entre voyageurs ou les notifications. Les dates de réservation sont saisies dans l’heure locale du voyage, sans conversion de fuseau horaire.
