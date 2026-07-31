# Wave Anime

A modern, high-performance web application for tracking and watching anime. Built with a stunning cyber-aesthetic design language and powered by a robust serverless architecture.

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Animations/UI**: Embla Carousel, Lucide React

### Backend & Infrastructure
- **Database**: Serverless PostgreSQL via Neon DB
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth (Secure Session Management)
- **Sync Service**: Standalone Node/Express server deployed on Render
- **Task Scheduling**: `node-cron` for periodic API synchronization

### Data Sources
- **AniList API**: Comprehensive anime metadata, banners, top lists, and scheduling.
- **Anikoto API**: Real-time episode and streaming link aggregation.
- **AniSkip API**: Timestamp mapping for automatic intro/outro skipping.

## ✨ Key Features
- **Cross-Device Sync & Seamless Watching**: Watch history and timestamp progress are instantly tracked and synchronized across all your devices. Includes intelligent conflict resolution if you watch on multiple devices simultaneously.
- **Profile & History Management**: A dedicated user profile to review, clear, and manage your watch history and watchlist.
- **Auto-Skip**: Automatically or manually skip anime Intros and Outros via AniSkip integration.
- **Robust Community**: Comment on episodes, upvote, and reply to others.
- **Notifications System**: Get in-app alerts when users reply to your comments or when the system sends a global broadcast.
- **Cyberpunk Admin Dashboard**: An immersive, high-tech command center to view traffic analytics (unique visitors, top anime, page views) via holographic data cards and send system-wide announcements via the broadcast terminal.
- **Bulletproof Responsive Design**: Advanced WebKit-safe flex configurations guarantee a perfect layout on all mobile devices.
- **Lightning Fast**: Built on a highly-optimized edge runtime pulling directly from serverless Postgres.

## 🧩 Architecture & Data Flow

Wave Anime relies on a decoupled architecture to avoid external API rate limits and deliver lightning-fast UI renders:

1. **The Sync Backend (`/backend`)**: 
   Since Vercel Serverless Functions have strict timeouts (10-60s), long-running synchronization logic is decoupled into a standalone Express backend hosted on Render. A cron job runs every 14 minutes to fetch real-time updates from Anikoto (paginated and rate-limited) and upserts them directly into our Neon Database.
   - **Resiliency & Fallbacks:** To manage free-tier compute limits (e.g. Neon DB compute hours or Render suspension), sync scripts (`scripts/sync.ts` and `scripts/full_sync.ts`) can be run manually or triggered via GitHub Actions. A detailed disaster recovery process is documented in `DB_MIGRATION_GUIDE.md`.
2. **The Frontend (`/app`)**:
   Next.js fetches the synchronized data directly from our Neon DB for blazing-fast page loads. For rich metadata (like banners and characters), the frontend queries the AniList GraphQL API client-side.
3. **State Management**:
   User interaction, watch history, and continued watching progress are managed through Zustand, ensuring a hydrated, seamless resume experience.

## 🎨 Design Language

Wave Anime utilizes a distinct Cyberpunk / Retrowave visual identity:
- **Colors**: 
  - Background: `void-black` (`#020204`)
  - Primary Highlight: `neon-crimson` (`#FF003C`)
  - Secondary Accents: `cyber-cyan` (`#00F0FF`) and `data-purple` (`#BD00FF`)
- **Shapes & Edges**: Flat glassmorphism (`surface-glass`) combined with sharp, angular "clip-corner" and "clip-chip" cutouts. No standard rounded corners.
- **Typography**: 
  - Headlines: Space Grotesk
  - Body: Outfit
  - Labels/Tags: JetBrains Mono
- **Interactions**: Glowing neon scrollbars, vibrant hover states, and smooth slide-in carousels.

## 💻 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm
- Neon DB connection string

### Setup

1. **Clone & Install**
   ```bash
   pnpm install
   ```

2. **Environment Variables**
   Create a `.env.local` in the root and configure the following variables:
   ```env
   # Database
   DATABASE_URL=your_neon_db_connection_string
   
   # Better Auth
   BETTER_AUTH_SECRET=your_secret_key
   BETTER_AUTH_URL=http://localhost:3000

   # Admin Access (comma separated emails)
   ADMIN_EMAILS=your.email@example.com
   ```

3. **Database Migrations**
   ```bash
   pnpm exec drizzle-kit push
   ```

4. **Run Development Server**
   ```bash
   pnpm run dev
   ```

5. **Run Sync Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

## 📜 License
MIT
