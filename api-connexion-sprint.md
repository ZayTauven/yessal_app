# Yessal Mobile - Checklist d'exécution API

## Objectif

Brancher proprement les écrans encore partiellement mockés sur les API backend existantes, sans casser la navigation ni la direction UX déjà harmonisée.

## État actuel

- [x] Auth complète: login, register, forgot password, logout, hydration de session.
- [x] Profil: `GET /api/profile/` et `PATCH /api/profile/`.
- [x] Dashboard home: `GET /api/analytics/`.
- [x] Campagnes: `GET /api/events/campaigns/`.
- [x] Événements: `GET /api/events/`.
- [x] Dons: `POST /api/contributions/` et `GET /api/contributions/`.
- [x] Tutelles: `GET /api/tutelles/` et `POST /api/tutelles/`.
- [x] Communauté: `GET /api/comms/`, `GET /api/comms/messages/`, `POST /api/comms/messages/`, `GET /api/comms/announcements/`.
- [x] Détail chat: navigation et envoi de message.
- [x] Détail campagne alimenté par l'API principale des campagnes.
- [x] Don transactionnel avec confirmation visuelle.
- [x] Historique dons dédié.
- [x] Notifications et annonces dédiées si on sort le contenu du home.
- [x] Avatar, sécurité, préférences de compte.
- [ ] Écrans admin ou rôle-dépendants si on les expose dans le mobile.
- [ ] Finition UX sur le scroll, les bas de page, et les carrousels horizontaux.

## Sprint 1 - Parcours Campagne

### Objectif

Rendre [app/campaign/[id].tsx](C:/xampp/htdocs/mesprojets/Proactive-corp/Yessal-ZCut/yessal-mobile/app/campaign/[id].tsx) complètement alimenté par l'API et faire de ce screen un point d'entrée réel vers le don.

### API

- `GET /api/events/campaigns/`
- À prévoir plus tard si exposé: `GET /api/events/campaigns/:id/`

### Checklist

- [x] Remplacer les données hardcodées du détail campagne.
- [x] Afficher `goal_amount`, `collected_amount`, `deadline`, `status`.
- [x] Afficher l'événement lié si disponible.
- [x] Rediriger le CTA vers `Don` avec la campagne pré-sélectionnée.
- [x] Gérer le cas où la campagne est absente ou inactive.
- [x] Faire pointer les cartes de [app/(app)/campaigns.tsx](C:/xampp/htdocs/mesprojets/Proactive-corp/Yessal-ZCut/yessal-mobile/app/(app)/campaigns.tsx) vers le détail campagne au lieu du don direct.

### Critère de fin

- [x] Aucun contenu critique hardcodé dans la page.
- [x] L'utilisateur peut partir d'une campagne et arriver sur le don prérempli.

## Sprint 2 - Don transactionnel

### Objectif

Transformer le don en vrai workflow de soumission et de confirmation.

### API

- `GET /api/events/campaigns/`
- `GET /api/tutelles/`
- `POST /api/contributions/`

### Checklist

- [x] Charger les campagnes et tutelles depuis l'API.
- [x] Garder le montant personnalisé visible et intuitif.
- [x] Pré-sélectionner une campagne si elle est passée en paramètre.
- [x] Préparer le retour visuel après création du don.
- [x] Ajouter un écran de confirmation dédié après `POST /api/contributions/`.
- [ ] Améliorer les messages d'erreur backend.
- [x] Revoir le retour utilisateur après soumission pour éviter les ambiguïtés.

### Critère de fin

- [ ] Le don peut être créé, confirmé visuellement, puis rejoué sans collision d'état.

## Sprint 3 - Historique dons

### Objectif

Donner une vraie page "Mes dons" depuis le menu.

### API

- `GET /api/contributions/`

### Checklist

- [x] Créer la page historique des contributions.
- [x] Lister les dons de l'utilisateur.
- [x] Afficher campagne, bénéficiaire, montant, date et statut.
- [x] Ajouter un filtre si utile: `pending`, `confirmed`, `failed`.
- [x] Brancher l'entrée depuis le drawer.

### Critère de fin

- [x] Le menu expose un vrai espace métier.

## Sprint 4 - Communauté complète

### Objectif

Terminer le module conversation avec navigation, lecture et envoi.

### API

- `GET /api/comms/`
- `GET /api/comms/messages/`
- `POST /api/comms/messages/`

### Checklist

- [x] Lister les chats.
- [x] Lister les messages.
- [x] Ouvrir un détail de conversation.
- [x] Permettre l'envoi de message.
- [x] Ajouter un vrai rafraîchissement visuel plus complet si nécessaire.
- [ ] Préparer un badge non-lu si le backend l'expose un jour.

### Critère de fin

- [ ] Une discussion peut être ouverte, lue, rafraîchie et alimentée sans fallback mocké.

## Sprint 5 - Annonces et Daara

### Objectif

Faire du home et de la page Daara de vrais panneaux de synthèse.

### API

- `GET /api/analytics/`
- `GET /api/comms/announcements/`

### Checklist

- [x] Brancher les KPI du home sur l'analytics backend.
- [x] Afficher les annonces réelles dans le home.
- [x] Brancher la page Daara sur l'analytics backend.
- [ ] Éviter les doubles sources de vérité entre home et daara.
- [ ] Sortir les annonces dans un écran dédié si nécessaire.

### Critère de fin

- [x] Le contenu de synthèse vient d'une seule source API.

## Sprint 6 - Profil éditable

### Objectif

Finaliser le flux de compte avec édition propre et actions utiles.

### API

- `GET /api/profile/`
- `PATCH /api/profile/`
- `POST /api/auth/forgot-password/`

### Checklist

- [x] Ajouter la modification du profil.
- [x] Stabiliser les messages d'erreur de base.
- [x] Préparer les futures sections sécurité et notifications.
- [x] Prévoir un avatar par défaut si aucun avatar n'est disponible.
- [ ] Ajouter plus tard un upload d'avatar si le backend l'expose.

### Critère de fin

- [ ] Le profil n'est plus passif, il devient un vrai écran de gestion de compte.

## Sprint 7 - Tutelle complète

### Objectif

Conserver la tutelle comme vrai flux métier et la rendre plus robuste.

### API

- `GET /api/tutelles/`
- `POST /api/tutelles/`
- `POST /api/contributions/`

### Checklist

- [x] Garder le montant personnalisé visible et intuitif.
- [x] Ajouter un retour clair après création de tutelle.
- [x] Réutiliser le même pattern de contribution que le don classique.
- [x] Ajouter un écran de confirmation dédié si nécessaire.

### Critère de fin

- [x] La tutelle reste un écran autonome et cohérent avec le flux don.

## Sprint 8 - Navigation et drawer

### Objectif

Donner une vraie place aux écrans secondaires sans casser la lisibilité de la tab bar.

### Checklist

- [x] Garder une bottom bar centrée sur les modules principaux.
- [x] Garder le drawer comme point d'accès aux modules secondaires.
- [x] Harmoniser les labels, les icônes et les destinations.
- [ ] Ajouter l'historique des dons dans le drawer.
- [x] Vérifier que le drawer ne ressemble jamais à une page.

### Critère de fin

- [ ] Le menu fonctionne comme une vraie navigation latérale.

## Sprint 9 - Audit scroll et confort de lecture

### Objectif

Corriger les écrans qui perdent des boutons sous la nav bar ou sous la zone de safe area.

### Pages à auditer

- [x] Home
- [x] Campagnes
- [x] Don
- [ ] Événements
- [x] Profil
- [ ] Tutelle
- [x] Chat detail

### Checklist

- [x] Vérifier le bas des ScrollView.
- [x] Ajouter les insets nécessaires.
- [x] Garder les CTA accessibles sans geste supplémentaire.
- [x] Vérifier les carrousels horizontaux sur petits écrans.

### Critère de fin

- [ ] Aucun CTA critique n'est caché par la barre du bas.

## Priorité recommandée

1. Détail campagne.
2. Don transactionnel.
3. Historique dons.
4. Chat complet.
5. Profil et tutelle.
6. Finition navigation et scroll.

## Focus actuel

- [x] Sprint 3 - Historique dons dédié.
- [ ] Sprint 4 - Chat / annonces si besoin d'un second bloc.
- [ ] Garder le focus sur les derniers écrans sensibles avant d'ouvrir un nouveau chantier.

## Notes de cadrage

- Le backend fournit déjà les endpoints principaux.
- Le travail restant est surtout du raccordement métier et de l'UX.
- Pour les paiements externes réels, il faudra plus tard ajouter un vrai provider selon le marché cible.
- Pour l'instant, le mobile doit rester stable, lisible et orienté action.
