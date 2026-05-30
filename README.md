# CRM NextLevel

CRM maison pour transformer une base brute de leads locaux (Google Maps +
SherlockMaps) en pipeline commercial clair. Aucun envoi automatique — tout
manuel.

Stack : Next.js (App Router) · TypeScript · Server Actions · PostgreSQL Neon ·
Prisma · Tailwind · Vercel.

Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour la conception complète.

## Setup

1. **Base Neon** — créer un projet Neon, récupérer les deux URLs et remplir
   `.env` à partir de `.env.example` :

   ```
   DATABASE_URL  = endpoint POOLED  (…-pooler…)  → runtime Vercel
   DIRECT_URL    = endpoint DIRECT  (sans pooler) → migrations Prisma
   CRM_BASIC_AUTH_USER / CRM_BASIC_AUTH_PASSWORD → accès CRM
   ```

2. **Migration** :

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

   Les migrations activent `pg_trgm`, les index GIN et les contraintes uniques
   de déduplication.

3. **Lancer** :

   ```bash
   npm run dev      # http://localhost:3000
   ```

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | build production (`prisma generate` + `next build`) |
| `npm test` | tests unitaires (normalize / scoring / dedup) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | seed config + démo |
| `npm run db:studio` | Prisma Studio |

## Écrans

Leads (liste + filtres URL) · Détail · Pipeline (Kanban drag) · Import
(CSV/JSON, par lots avec reprise) · Scoring (poids éditables) · Notes & Tâches ·
Export (CSV/JSON, téléchargement local).

## Déploiement Vercel

- Variables d'env : `DATABASE_URL` (poolé), `DIRECT_URL` (direct),
  `CRM_BASIC_AUTH_USER`, `CRM_BASIC_AUTH_PASSWORD`.
- Build command par défaut (`npm run build`) lance `prisma generate`.
- Appliquer les migrations en CI/CD : `npx prisma migrate deploy`.
