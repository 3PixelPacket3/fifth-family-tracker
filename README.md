# Vinciguerra Lupo Cartel — Tax & Treasury Tracker ("The Fifth Family")

A mobile-first, Jamstack family tax and `$511M+` Cartel Treasury management application engineered to migrate the **Vinciguerra Lupo Cartel** from a legacy Google Sheet into an automated, **Cloud Firestore Security Rules** protected web application hosted on **GitHub Pages**.

## 1. Architecture & Tech Stack
- **Front-End Framework**: Next.js 15 configured for Static Site Generation (`output: 'export'` in [`next.config.ts`](next.config.ts)) for free static hosting on **GitHub Pages**.
- **Database & Authentication**: **Firebase Authentication & Cloud Firestore** (`firebase` SDK in [`src/lib/firebase.ts`](src/lib/firebase.ts)) with Document-Level Security Rules in [`firebase/firestore.rules`](firebase/firestore.rules) and composite indexes in [`firebase/firestore.indexes.json`](firebase/firestore.indexes.json).
- **Live State & Cross-Tab Sync**: **Zustand** ([`src/store/useCartelStore.ts`](src/store/useCartelStore.ts)) with `storage` event hydration so updates made in one browser tab immediately synchronize across open tabs without refreshing.
- **CI/CD Deployment**: Automated GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) that compiles `./out` and deploys directly to **GitHub Pages**.

## 2. Cloud Firestore Collections (`firebase/firestore.rules`)
- **`profiles` Collection**: Stores `id`, `game_name` (`"Wolfie05"`, `"PixelPacket"`), `rank` (`Don`, `Underboss`, `Capo`, `Soldier`, `Associate`), `level` (Integer), and `role` (`Admin`, `User`).
- **`tax_logic` Collection**: Stores dynamic level-to-tax brackets (`1 -> $0`, `40 -> $2,000,000`, `50 -> $4,000,000`, `60 -> $7,000,000`, `80 -> $15,000,000`, `100 -> $32,000,000`, `120 -> $55,000,000`, `140 -> $86,000,000`).
- **`weekly_contributions` Collection**: Stores `record_id`, `player_id`, `week_start_date`, `amount_paid`, and `status` (`Pending`, `Complete`).
- **`cartel_treasury_meta` Collection**: Tracks the `$511M+` Cartel Treasury balance and active Sunday rollover date.
