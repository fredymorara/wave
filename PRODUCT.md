# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anime enthusiasts, casual viewers, and community members who want a responsive, distraction-free environment to discover, track, and stream anime episodes, engage in episode comments, receive notifications, and manage watch history across devices. Also includes site administrators who monitor analytics and broadcast system updates.

## Product Purpose

Wave Anime provides a high-performance, low-latency web application for discovering, tracking, and watching anime. It eliminates typical slow API load times by caching synchronized streaming data in serverless PostgreSQL while providing automated intro/outro skipping, watch progress sync, and community interactions.

## Positioning

Unlike standard anime aggregation websites or slow wrapper apps, Wave Anime decouples long-running third-party API sync (Anikoto, AniList) into a background engine, serving edge-rendered data instantly from Neon Database alongside a signature brutalist cyberpunk aesthetic.

## Operating Context

Web application used on desktop and mobile browsers. Primary activities include streaming episodes with video player controls, tracking episode progress, writing/upvoting comments, viewing notifications, and managing watchlists.

## Capabilities and Constraints

- **Capabilities**:
  - Edge-fast anime browsing and detail pages using serverless Postgres.
  - Video streaming with AniSkip automatic OP/ED skipping.
  - User authentication and session persistence via Better Auth.
  - Episode-level community comments and upvotes.
  - Real-time in-app notification system for replies and broadcasts.
  - Admin dashboard with privacy-focused traffic analytics and announcements.
- **Constraints**:
  - Heavy background API sync logic must run outside Next.js on the Render Express backend to adhere to Vercel Hobby serverless timeouts (10-60s limit).
  - Anikoto API rate limits (60 requests / 120s) require strict pagination and delays in background tasks.

## Brand Commitments

- **Name**: Wave Anime
- **Visual Language**: Retrowave / Cyberpunk theme.
- **Palette**: `void-black` (`#020204`), `neon-crimson` (`#FF003C`), `cyber-cyan` (`#00F0FF`), `data-purple` (`#BD00FF`).
- **Geometrics**: Angular brutalist styling with `clip-corner` and `clip-chip` shapes; avoiding standard rounded corners (`rounded-lg`).
- **Typography**: Space Grotesk (headings), Outfit (body text), JetBrains Mono (labels/chips/code).

## Evidence on Hand

- Source code in `app/`, `components/`, `db/`, `store/`, and `backend/`.
- Repository documentation in `README.md` and system rules in `AGENTS.md`.

## Product Principles

1. **Instant Response First**: Prioritize local Neon database queries over heavy runtime API fetching to keep page loads fast and responsive.
2. **Cyberpunk Authenticity**: Enforce sharp geometric cutouts, stark contrast, and neon highlights across all UI surfaces without falling back to generic rounded components.
3. **Decoupled Heavy Lifting**: Offload long-running background tasks and external rate-limited syncing to dedicated services.
4. **Seamless Resume**: Maintain friction-free watch state and history sync across user sessions.

## Accessibility & Inclusion

- High-contrast neon-on-dark visual hierarchy for clear legibility.
- Keyboard accessible video playback and navigation controls.
