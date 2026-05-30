# CRM NextLevel — Spécification à valider (v2, sans code)

CRM maison pour transformer une base brute de leads locaux (Google Maps +
SherlockMaps) en pipeline commercial clair. But unique : Warren voit vite les
meilleurs prospects, sans bruit.

**Contraintes dures**
- Aucun envoi automatique (email / SMS / WhatsApp / LinkedIn). Tout envoi manuel
  ou validé par un humain.
- Pas de sur-ingénierie, pas de jargon.
- Interface sobre, moderne, rapide. Outil agréable, pas brut.

**Stack** : TypeScript · Next.js App Router · Server Actions (Node) · PostgreSQL
Neon · Prisma · déploiement Vercel · Tailwind.

---

## 1. Architecture cible

Monolithe Next.js unique sur Vercel. Pas de microservice, pas de file d'attente,
pas de worker.

```
Navigateur (React, Tailwind, shadcn/ui)
        │  RSC (lecture)  +  Server Actions (mutations)
        ▼
Next.js App Router (runtime Node sur Vercel)
        │
        ▼
lib/  ── métier pur, testable
  ├─ normalize.ts   normalisation des champs
  ├─ dedup.ts       déduplication priorisée
  ├─ scoring.ts     score + breakdown
  ├─ import.ts      parse CSV / JSON / saisie + mapping
  └─ export.ts      génération de fichiers
        │
        ▼
Prisma  ──►  Postgres Neon
```

Décisions :
- **Lecture en RSC, écriture en Server Actions.** Pas d'API REST à maintenir en
  plus.
- **Tout le métier dans `lib/` en fonctions pures** (aucune dépendance UI/DB) →
  testable, modifiable sans casser le reste.
- **Deux URLs Neon (point à verrouiller en premier)** :
  - `DATABASE_URL` → endpoint **pooled** (PgBouncer) pour le runtime Vercel
    serverless (évite la saturation des connexions Postgres).
  - `DIRECT_URL` → endpoint **direct** (non poolé) pour les migrations Prisma
    (`prisma migrate` exige une connexion directe). Déclaré dans le `datasource`
    via `directUrl`.
- **Aucun service d'envoi branché nulle part.** L'export est un téléchargement de
  fichier local → conforme à « tout manuel ».
- **Import par lots plafonnés avec reprise** (voir §6.4) — pas de worker externe,
  mais une limite dure par lot pour ne jamais heurter le timeout d'exécution
  Vercel.

---

## 2. Modèle de données (Postgres Neon / Prisma)

5 tables. Les tags sont un **tableau d'enum natif Postgres sur `Lead`** (décision :
pas de table de jointure → plus simple, suffisant pour 7 tags fixes).

### Table `Lead`
| Champ | Type | Rôle |
|---|---|---|
| id | cuid (PK) | identifiant |
| companyName | text | nom entreprise (requis) |
| contactName | text? | nom contact |
| phone | text? | téléphone |
| email | text? | email |
| website | text? | site web |
| address | text? | adresse |
| city | text? | ville |
| source | enum `Source` | GOOGLE_MAPS · SHERLOCK_MAPS · MANUEL · IMPORT_CSV · IMPORT_JSON |
| category | text? | catégorie métier |
| googleRating | float? | note Google |
| reviewCount | int? | nombre d'avis |
| hasWebsite | bool | présence d'un site |
| technologies | text[] | technos détectées |
| score | int | 0–100 |
| scoreBreakdown | jsonb | détail lisible du calcul |
| status | enum `Status` | défaut BRUT |
| tags | enum `Tag`[] | tableau de tags |
| lastContactAt | timestamp? | dernier contact |
| nextAction | text? | prochaine action |
| nextActionAt | timestamp? | échéance prochaine action |
| internalNotes | text? | notes internes |
| normPhone | text? *(index)* | tél normalisé (dedup) |
| normEmail | text? *(index)* | email normalisé (dedup) |
| normDomain | text? *(index)* | domaine normalisé (dedup) |
| normName | text? *(index)* | nom normalisé (dedup) |
| masterId | cuid? *(self-rel)* | si doublon → pointe vers le lead maître |
| importBatchId | cuid? *(FK)* | lot d'import d'origine |
| createdAt / updatedAt | timestamp | méta |

Index additionnels : `status`, `score`, `city`, plus **index GIN sur `tags`**
(filtres combinés sur tableau d'enum performants). Extension **`pg_trgm` activée
dans Neon dès le setup** (indispensable au fuzzy match « nom proche » de la
dedup) + index GIN trigram sur `normName`.

### Table `Task`
| Champ | Type |
|---|---|
| id | cuid (PK) |
| leadId | FK → Lead (cascade) |
| title | text (requis) |
| status | enum TODO · DONE |
| dueAt | timestamp? |
| createdAt | timestamp |

### Table `Activity` (historique / timeline)
| Champ | Type |
|---|---|
| id | cuid (PK) |
| leadId | FK → Lead (cascade) |
| type | text : note · status_change · score_change · manual_contact |
| body | text |
| actor | text? | auteur de l'action (défaut « Warren ») |
| createdAt | timestamp |

Décision : champ `actor` dès le début (même mono-utilisateur) → traçabilité
préservée si le CRM passe à plusieurs utilisateurs plus tard, sans migration de
l'historique.

### Table `ImportBatch`
| Champ | Type |
|---|---|
| id | cuid (PK) |
| filename | text |
| format | enum CSV · JSON · MANUEL |
| rowCount / importedCount / duplicateCount / errorCount | int |
| createdAt | timestamp |

Permet de **rollback un import entier** (suppression par lot) → l'import n'est
plus irréversible.

### Table `ScoreConfig` (singleton, 1 ligne)
| Champ | Type | Rôle |
|---|---|---|
| id | int = 1 | singleton |
| weights | jsonb | poids des bonus/malus (§4) |
| targetCategories | text[] | catégories cibles NextLevel |
| targetCities | text[] | villes cibles |
| updatedAt | timestamp | |

Décision : config scoring **en base** (seedée depuis le code) → modifiable dans
l'UI sans redéploiement.

**Vues sauvegardées (Filtres)** : en `localStorage` **v1 uniquement** — logique
par poste assumée. Pas fiable entre appareils ; passage à une table `SavedView`
en base prévu pour v2 dès qu'on veut des vues partagées multi-poste.

---

## 3. Design & performance (beau, lisible, rapide)

Décisions concrètes pour un rendu soigné sans construire un design system maison :
- **shadcn/ui + Radix + Tailwind.** Composants prêts, accessibles, élégants.
- **Police Geist (ou Inter), palette neutre `zinc` + 1 accent** (emerald). Sobre.
- **Layout** : sidebar gauche fine (navigation entre les 8 écrans) + topbar
  (recherche, compteurs) + contenu dense mais aéré.
- **Palette de commandes `Cmd-K`** : naviguer, rechercher un lead, changer un
  statut au clavier → rapidité.
- **Badges** : Statut (couleur par étape) et Score (échelle de couleur
  0→100 froide→chaude) lisibles d'un coup d'œil.
- **États soignés** : skeletons au chargement, états vides illustrés, toasts
  (`sonner`) sur action, confirmations en modale.

Performance :
- **RSC + streaming**, **pagination côté serveur**, **index DB**, recherche
  **debounced**.
- **État dans l'URL** (filtres, tri, page) → partageable, bookmarkable, retour
  arrière natif.
- **Updates optimistes** sur changements de statut / tags / tâches → ressenti
  instantané.

---

## 4. Scoring (simple, lisible, modifiable)

Poids dans `ScoreConfig` (seed depuis le code). Score borné **0–100**. Chaque
lead stocke son **breakdown** (affiché sur la fiche).

**Bonus**
- Site actif mais faible/moyen → opportunité refonte (cœur de cible NextLevel).
- Catégorie alignée avec NextLevel.
- Facilité de contact (téléphone **et** email présents).
- Bon signal local (ville cible ; note ≥ 4 et ≥ 10 avis = business sérieux).

**Malus**
- Doublon (tag `DOUBLON` / `masterId` présent).
- Données incomplètes (champs clés manquants).
- Hors cible (catégorie non pertinente).
- Absence de contact (ni tél ni email).

Décision : « site faible/moyen » détecté par heuristique sur `technologies`
(Wix, vieux CMS, aucune techno moderne) **ou** tag manuel `SITE_FAIBLE` →
combine signal auto et jugement humain. Le breakdown liste chaque ligne (+/–)
pour que le score soit transparent et discutable.

---

## 5. Déduplication

Sur **champs normalisés**, règles par priorité. Pas de match exact sur tous les
champs.

| Priorité | Clé | Action |
|---|---|---|
| 1 forte | `normPhone` identique | doublon → relié au maître |
| 2 forte | `normEmail` identique | doublon → relié au maître |
| 3 forte | `normDomain` identique | doublon → relié au maître |
| 4 forte | `normName` + `city` identiques | doublon → relié au maître |
| 5 faible | `normName` proche (trigram) + `city` | **vérification manuelle** (tags `DOUBLON` + `A_VERIFIER`) |

- **Aucun doublon supprimé brutalement.** Il reçoit `masterId` → traçable,
  réversible.
- **Maître** = enregistrement le plus complet (max de champs non nuls, puis score
  le plus élevé). Fusion : comble les trous depuis les doublons, union des tags,
  concatène les notes.
- **En cas de doute** (match faible) → le lead passe en vérification manuelle,
  jamais fusionné automatiquement.

---

## 6. Les 8 écrans

Pour chacun : composants · actions · état vide · filtres · validation.

### 6.1 Liste
- **UI** : tableau dense triable, recherche debounced, multi-sélection + barre
  d'actions groupées, badges Statut/Score, chips Tags, icônes présence tél/email,
  tri par score décroissant par défaut, pagination serveur.
- **Colonnes** : Entreprise · Ville · Catégorie · Score · Statut · Tél/Email ·
  Note Google · Site (O/N) · Dernier contact · Prochaine action.
- **Actions** : ouvrir détail ; statut inline ; tag inline ; groupées (statut,
  tag, export sélection, marquer doublon, supprimer).
- **Vide** : aucun lead → CTA « Importer » ; aucun résultat → « Réinitialiser les
  filtres ».
- **Filtres** : statut, tag, ville, catégorie, plage score, site O/N, source,
  présence tél/email (système partagé §6.7).
- **Validation** : suppression groupée → confirmation ; tout changement
  journalisé ; aucune action externe.

### 6.2 Détail
- **UI** : en-tête (nom, badge Score + breakdown, sélecteur Statut, éditeur de
  Tags) ; sections Coordonnées (form éditable), Signaux (note Google, avis, site,
  technos), Pipeline (statut, prochaine action + date, dernier contact), Notes
  internes (autosave), Timeline d'activité, mini-Tâches, panneau breakdown.
- **Actions** : éditer (autosave) ; changer statut ; définir prochaine action +
  date ; **« Enregistrer un contact »** (manuel → `lastContactAt = now` + entrée
  timeline, aucun envoi) ; ajouter tâche/note ; copier tél/email ; ouvrir site ;
  marquer doublon / fusionner.
- **Vide** : pas d'activité → « Ajoutez une note » ; pas de tâche → « Aucune
  tâche ».
- **Validation** : `companyName` requis ; format email/tél = alerte douce non
  bloquante (données brutes) ; fusion = choix du maître + confirmation.
- La fiche montre **ce qui compte pour décider** : score + breakdown, signaux
  Google, présence/qualité du site, facilité de contact, statut.

### 6.3 Pipeline (Kanban)
- **UI** : board, une colonne par Statut, carte glissable (nom, score, ville,
  prochaine action, tags), compteur + total par colonne.
- **Actions** : glisser entre colonnes → change le statut (journalisé) ; clic →
  tiroir détail ; note rapide ; barre de filtres.
- **Vide** : colonne vide → placeholder ; board vide → « Importez des leads ».
- **Validation** : passage en `GAGNE`/`PERDU` → invite à saisir une raison ;
  aucun déclenchement externe.

### 6.4 Import
- **UI** : zone de dépôt **CSV / JSON** + **saisie manuelle** ; mapping de
  colonnes (auto-map par en-têtes, remap manuel) ; aperçu des lignes ; **aperçu
  dedup** (X nouveaux · Y reliés · Z à vérifier) ; erreurs par ligne ; résumé.
- **Flux** : upload/saisie → parse → normalisation → dedup → aperçu →
  confirmation → écriture (crée un `ImportBatch`, scoring auto).
- **Lots plafonnés + reprise (anti-timeout Vercel)** : le client découpe le
  fichier en **chunks de ~300 lignes**, chaque chunk = un appel Server Action
  distinct (largement sous la limite d'exécution Vercel). L'`ImportBatch` stocke
  un curseur (offset traité) → si un chunk échoue ou si l'onglet ferme, l'import
  **reprend au dernier chunk validé**, sans doublonner. Barre de progression
  alimentée par les compteurs du lot. Décision : pas de worker, le client
  orchestre la séquence → simple et robuste aux gros fichiers.
- **Vide** : pas de fichier → « Glissez un CSV / JSON, ou saisissez un lead ».
- **Validation** : mapping `companyName` requis ; rejet des lignes sans champ
  identifiant ; confirmation avant commit (réversible par lot).

### 6.5 Scoring
- **UI** : panneau des poids éditables (lecture/écriture `ScoreConfig`), listes
  catégories/villes cibles, légende du breakdown, histogramme de distribution,
  aperçu des meilleurs leads, bouton « Recalculer tous les scores ».
- **Actions** : éditer poids/cibles ; sauvegarder ; recalculer tout ;
  prévisualiser l'impact ; réinitialiser aux défauts.
- **Vide** : pas de leads → « Importez des leads ».
- **Validation** : poids bornés ; recalcul global = confirmation (réversible en
  relançant) ; journalisé.

### 6.6 Notes & Tâches
- **UI** : liste globale des tâches groupée par échéance (en retard / aujourd'hui
  / cette semaine), ligne tâche (lien lead, titre, échéance, case faite),
  formulaire d'ajout, fil des notes récentes.
- **Actions** : créer/cocher/éditer/supprimer tâche ; sauter au lead ; note
  rapide.
- **Vide** : « Aucune tâche. Vos relances apparaîtront ici. »
- **Validation** : titre + lead requis ; **aucun rappel envoyé** (affichage seul) ;
  retards surlignés.

### 6.7 Filtres
- Système **transversal** (Liste + Pipeline), source de vérité = **query params
  de l'URL** via un hook `useFilters`.
- **UI** : tiroir, multi-select statut/tag/catégorie/ville/source, slider plage
  score, toggles (a un site / tél / email), chips de filtres actifs, vues
  sauvegardées (nommer une combinaison).
- **Actions** : appliquer, tout effacer, sauvegarder/charger une vue, vue par
  défaut.
- **Vide** : pas de vue → « Créez une vue ».
- **Validation** : `min ≤ max` ; nom de vue requis ; vues en localStorage (v1).

### 6.8 Export
- **UI** : choix des colonnes, portée (filtre courant / sélection / tout), format
  **CSV / JSON**, compteur d'aperçu, bouton exporter, historique des exports.
- **Actions** : configurer → générer → télécharger (côté serveur, stream).
- **Vide** : rien à exporter → bouton désactivé + indice.
- **Validation** : ≥ 1 colonne, portée non vide ; **export = fichier local
  uniquement, aucun envoi** → conforme à « tout manuel ».

---

## 7. Flux utilisateur complet

1. **Importer** (CSV / JSON / saisie) → mapping → **normalisation** → **dedup** →
   les leads arrivent en `BRUT`.
2. **Scoring auto** à l'import → triés par score.
3. **Enrichir** (combler les trous, technos, signaux) : `A_ENRICHIR`.
4. **Qualifier** : examiner hauts scores → `A_QUALIFIER` → `QUALIFIE`.
5. **Segmenter** (Filtres/Liste) → liste d'appel : `PRIORITAIRE` + score élevé +
   a un téléphone.
6. **Préparer un contact manuel validé** : la fiche montre tout pour décider →
   Warren contacte lui-même → **« Enregistrer un contact »** (`CONTACTE`).
7. **Pipeline** (Kanban) : `EN_DISCUSSION` → `GAGNE` / `PERDU`.
8. **Relances** suivies dans Notes & Tâches.
9. **Exporter** un segment propre si besoin.

Le CRM organise et fait remonter les meilleurs prospects. Il n'agit jamais à la
place de Warren.

---

## 8. Plan de mise en œuvre (étapes courtes, chacune livrable)

| # | Étape | Contenu |
|---|---|---|
| 0 | Init | Next.js + TS + Tailwind + shadcn/ui + Prisma + Neon ; **`DATABASE_URL` poolé + `DIRECT_URL` direct** ; **activer `pg_trgm`** ; env, lint |
| 1 | Schéma | Tables + enums + **index GIN tags & trigram** + migration + seed `ScoreConfig` |
| 2 | Normalisation / Dedup | `lib/normalize` + `lib/dedup` + tests |
| 3 | Scoring | `lib/scoring` + config + tests |
| 4 | Shell UI | Layout sidebar/topbar, thème, palette `Cmd-K`, toasts |
| 5 | Liste | CRUD + tableau, filtres URL, tri, actions groupées |
| 6 | Détail | Édition, statut, notes, timeline, mini-tâches |
| 7 | Import | Parse CSV/JSON/saisie, mapping, aperçu dedup, commit, lot |
| 8 | Scoring (écran) | Édition poids/cibles, recalcul global, distribution |
| 9 | Pipeline | Kanban drag → statut |
| 10 | Notes & Tâches | Écran global tâches + fil de notes |
| 11 | Filtres | Polissage + vues sauvegardées |
| 12 | Export | CSV/JSON, portée filtrée/sélection/tout |
| 13 | QA & deploy | États vides, validations, garde-fous, déploiement Vercel |

---

## 9. Décisions prises (récap des arbitrages)

1. **Tags = tableau d'enum sur `Lead` + index GIN** (pas de table de jointure) —
   7 tags fixes, suffisant pour les filtres combinés v1 ; relation possible plus
   tard si le besoin de filtrage explose.
2. **Vues filtrées en localStorage v1 seulement** — logique par poste ; table
   `SavedView` en base prévue v2 pour le multi-appareil.
3. **Config scoring en base (1 ligne)** — éditable dans l'UI sans redéploiement.
4. **Deux URLs Neon** : `DATABASE_URL` poolé (runtime Vercel) + `DIRECT_URL`
   direct (migrations Prisma) — point verrouillé en priorité.
5. **`pg_trgm` activé dès le setup** — indispensable à la dedup « nom proche ».
6. **Import par chunks ~300 lignes + curseur de reprise** — anti-timeout Vercel,
   sans worker.
7. **`actor` sur `Activity` dès le début** — traçabilité préservée si passage
   multi-utilisateur.
8. **« Site faible » = heuristique technos + override manuel** — combine auto et
   jugement humain.
9. **Import limité à CSV / JSON / saisie** ; **enrichissement par champs
   import/manuel**, pas de scraping live.
10. **shadcn/ui** comme base visuelle ; **doublons reliés, jamais supprimés**,
    matchs faibles → vérification manuelle.

À valider : si un point ne te convient pas, dis lequel, je l'ajuste avant tout
code.
