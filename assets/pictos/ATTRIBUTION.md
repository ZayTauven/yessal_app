# Pictogrammes — provenance et attribution

Les huit tracés de ce dossier viennent du **Noun Project**. Ils ont été fournis
par le commanditaire dans
`AGENTS/Design-Analyse-UX/Refonte mobile Yessal Gui/assets/illustrations/`,
puis retravaillés pour l'application.

## Ce qui a été fait aux fichiers

Les exports du Noun Project portent le bandeau « Created by … / from Noun
Project » incrusté en bas de la toile 700 × 700. Il a été **amputé** : un
bandeau de crédit gravé dans le pixel n'a rien à faire dans une bande qui
défile à 56 px de côté.

Trois opérations, dans cet ordre, par
`AGENTS/Design-Analyse-UX/prepare_pictos.py` :

1. coupe à la ligne 590 — mesuré sur les 19 fichiers, le tracé ne descend
   jamais sous 567 et le bandeau ne monte jamais au-dessus de 613 ;
2. recadrage sur le tracé puis mise au carré autour de son centre, marge 9 % —
   les toiles d'origine ont des marges allant de 32 à 149 px, sans quoi deux
   pictogrammes voisins n'auraient pas le même poids optique ;
3. teinte en `Violet[900]` (`#2F1966`), alpha conservé — c'est la règle écrite
   dans `theme/tokens.ts` : « le trait des pictogrammes posés dessus est
   Violet[900], jamais noir ».

Sortie : PNG 192 × 192 (56 pt × 3 pour la densité @3x), 76 Ko pour les huit.

## ⚠ L'attribution reste due

Amputer le bandeau **ne supprime pas l'obligation**. Les téléchargements
gratuits du Noun Project sont sous licence **CC BY** : elle autorise la
modification et l'usage commercial, mais **exige le crédit de l'auteur**.

Ce fichier tient lieu de crédit dans le dépôt. **Il ne suffit pas si
l'application est publiée** : le crédit doit être visible par l'utilisateur —
la place naturelle est un écran « À propos » sous Paramètres.

**Deux façons de solder la question, au choix du commanditaire :**

- ajouter les huit lignes ci-dessous à un écran « À propos » ;
- ou, si le compte Noun Project est un abonnement **Pro** (licence royalty-free
  sans attribution), vérifier que ces huit icônes ont bien été téléchargées
  sous cet abonnement — auquel cas rien n'est dû et ce fichier devient une
  simple note de provenance.

Tant que ce n'est pas tranché, considérer l'attribution comme due.

## Les huit tracés

| Fichier | Sujet | Auteur | Source |
|---|---|---|---|
| `appel.png` | mégaphone — l'appel du Ndiguel | Smashing Stocks | `noun_Sound_4458767` |
| `collecte.png` | portefeuille — la collecte | Vectors Market | `noun_financerecord_7507683` |
| `echeance.png` | sablier — l'échéance | Vectors Market | `noun_deadline_7507515` |
| `diaspora.png` | globe et repère — les membres au loin | Smashing Stocks | `noun_Geolocation_4459022` |
| `repas.png` | plat servi — le repas partagé | Smashing Stocks | `noun_butlerbutton_4458856` |
| `main-tendue.png` | poignée de main — le Jëf pour autrui | Vectors Market | `noun_relationship_7507502` |
| `proche.png` | une personne et un cœur — porter un proche | Symbolon | `noun_landscape_1064950` |
| `generosite.png` | deux cœurs — la générosité | Symbolon | `noun_dating_1073828` |

Onze autres tracés du même lot sont restés au dossier de la planche, prêts à
être passés au même traitement : conversation, messages, calendrier, cadenas,
croissant, carte d'identité, journal, médaille, réseau, hexagones, retour.
Écartés pour la bande défilante parce qu'ils s'y brouillaient à 56 px
(`feedback`, `id`, `news`) ou parce qu'ils ne disaient rien du produit
(`structure`).
