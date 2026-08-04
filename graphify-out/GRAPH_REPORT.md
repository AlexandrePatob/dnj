# Graph Report - C:\Users\Alexandre\Documents\Projetos Pessoais\dnj\dnj-game-front  (2026-07-22)

## Corpus Check
- Corpus is ~45,167 words - fits in a single context window. You may not need a graph.

## Summary
- 435 nodes · 549 edges · 52 communities (42 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Service Worker Runtime
- Development Dependencies
- PWA UI Components
- Main Application State
- TypeScript Configuration
- Session Restoration and Snapshot
- Package Scripts
- Runtime Dependencies
- Session Restoration Tests
- PWA Architecture
- Playwright Test Helpers
- HTTP API Client
- PWA Icon Generation
- Application Screens
- Service Worker Build
- App Layout and Manifest
- Network Status Hook
- Authentication and Groups API
- Install Promotion Design
- Frontend Authentication Architecture
- Validation Lessons
- PWA Feature Requirements
- App Icon 192
- App Icon 512
- Maskable App Icon
- Apple Touch Icon
- Application Icon
- Primary Brand Lockup
- Composite Brand Logo
- Game and Ranking
- Product Vision
- Service Worker Build Types
- Primary White Logo
- Cyan Game Logo
- Large White Logo
- Alternate White Logo
- Build Fix Validation
- Git Workflow
- Next Configuration
- Playwright Configuration
- PostCSS Configuration
- Icon Generator Types
- Participant Onboarding
- Vitest Configuration
- Installable Assets

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `DnjApp()` - 14 edges
3. `scripts` - 13 edges
4. `PwaRegistrar()` - 10 edges
5. `animStyle()` - 9 edges
6. `useNetworkStatus()` - 7 edges
7. `isOfflineSnapshot()` - 7 edges
8. `PWA Architecture` - 7 edges
9. `isApprovedAsset()` - 6 edges
10. `ConnectivityStatus()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Safe Offline Data` --semantically_similar_to--> `Offline Snapshot`  [INFERRED] [semantically similar]
  docs/pwa.md → .specs/features/pwa-migration/design.md
- `DnjApp()` --indirect_call--> `response()`  [INFERRED]
  src/components/dnj-app.tsx → src/lib/api/client.test.ts
- `Versioned Local Session` --conceptually_related_to--> `API Authentication Contract`  [INFERRED]
  docs/frontend-architecture.md → README.md
- `isLocalDevelopmentOrigin()` --references--> `LOCAL_HOSTNAMES`  [EXTRACTED]
  public/sw.js → src/pwa/cache-policy.ts
- `isApprovedAsset()` --references--> `FONT_EXTENSIONS`  [EXTRACTED]
  public/sw.js → src/pwa/cache-policy.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **PWA Runtime Components** — _specs_features_pwa_migration_design_pwa_registrar, _specs_features_pwa_migration_design_connectivity_status, _specs_features_pwa_migration_design_offline_snapshot [EXTRACTED 1.00]
- **Install Promotion Platform Flows** — _specs_features_pwa_install_promotion_spec_chromium_install_flow, _specs_features_pwa_install_promotion_spec_ios_manual_install_flow, _specs_features_pwa_install_promotion_spec_progressive_install_enhancement [EXTRACTED 1.00]
- **DNJ Icon Identity** — public_icons_icon_192x192_dnj_monogram, public_icons_icon_192x192_2k26_cwb_badge, public_icons_icon_192x192_orange_brand_field [EXTRACTED 1.00]
- **DNJ Icon Identity** — public_icons_icon_512x512_dnj_monogram, public_icons_icon_512x512_2k26_cwb_badge, public_icons_icon_512x512_orange_brand_field [EXTRACTED 1.00]
- **Maskable DNJ Brand Composition** — public_icons_icon_maskable_512x512_centered_dnj_monogram, public_icons_icon_maskable_512x512_2k26_cwb_badge, public_icons_icon_maskable_512x512_orange_safe_area [EXTRACTED 1.00]
- **DNJ Apple Icon Identity** — src_app_apple_icon_dnj_monogram, src_app_apple_icon_2k26_cwb_badge, src_app_apple_icon_orange_brand_field [EXTRACTED 1.00]
- **DNJ Application Icon Identity** — src_app_icon_dnj_monogram, src_app_icon_2k26_cwb_badge, src_app_icon_orange_brand_field [EXTRACTED 1.00]
- **DNJ Game Visual Identity** — src_assets_brand_dnjgame_01_green_dnj_monogram, src_assets_brand_dnjgame_01_2k26_cwb_badge, src_assets_brand_dnjgame_01_orange_game_wordmark [EXTRACTED 1.00]
- **Full DNJ Game Brand Lockup** — src_assets_brand_dnjgame_02_dnj_game_composite_logo, src_assets_brand_dnjgame_02_dnj_monogram, src_assets_brand_dnjgame_02_2k26_cwb_badge, src_assets_brand_dnjgame_02_game_wordmark [EXTRACTED 1.00]
- **GAME Mark Composition** — src_assets_brand_dnjgame_dark_game_logo, src_assets_brand_dnjgame_dark_game_wordmark, src_assets_brand_dnjgame_dark_rounded_square_frame [EXTRACTED 1.00]
- **Primary DNJ Brand Lockup** — src_assets_brand_dnj_geral_dnj_primary_logo, src_assets_brand_dnj_geral_dnj_monogram, src_assets_brand_dnj_geral_2k26_cwb_badge [EXTRACTED 1.00]
- **Oversized DNJ Brand Lockup** — src_assets_testeasset_1_4x_3_dnj_oversized_logo, src_assets_testeasset_1_4x_3_dnj_monogram, src_assets_testeasset_1_4x_3_2k26_cwb_badge [EXTRACTED 1.00]
- **Oversized DNJ Brand Lockup** — src_assets_testeasset_1_4x_dnj_oversized_logo, src_assets_testeasset_1_4x_dnj_monogram, src_assets_testeasset_1_4x_2k26_cwb_badge [EXTRACTED 1.00]

## Communities (52 total, 10 thin omitted)

### Community 0 - "Service Worker Runtime"
Cohesion: 0.06
Nodes (23): classifyRequest(), extensionOf(), isApprovedAsset(), isLocalDevelopmentOrigin(), CacheStrategy, classifyRequest(), extensionOf(), FONT_EXTENSIONS (+15 more)

### Community 1 - "Development Dependencies"
Cohesion: 0.05
Nodes (37): esbuild, eslint, eslint-config-next, jsdom, devDependencies, esbuild, eslint, eslint-config-next (+29 more)

### Community 2 - "PWA UI Components"
Cohesion: 0.09
Nodes (26): ConnectivityStatus(), ConnectivityStatusProps, getClientHydrationSnapshot(), getServerHydrationSnapshot(), subscribeToHydration(), InstallPromotion(), InstallPromotionProps, defaultProps (+18 more)

### Community 3 - "Main Application State"
Cohesion: 0.06
Nodes (17): AnimDir, AUTH_ORDER, CONFESSION_FAQ, GameTab, getAnimDir(), MAP_PINS, POINTS_LOG, QueueType (+9 more)

### Community 4 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+19 more)

### Community 5 - "Session Restoration and Snapshot"
Cohesion: 0.18
Nodes (17): DnjApp(), mockSession(), sessionUserData(), clearOfflineSnapshot(), FORBIDDEN_KEYS, hasExactKeys(), hasForbiddenKey(), isOfflineSnapshot() (+9 more)

### Community 6 - "Package Scripts"
Cohesion: 0.11
Nodes (18): name, overrides, postcss, private, scripts, build, dev, lint (+10 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (17): lucide-react, motion, next, dependencies, lucide-react, motion, next, react (+9 more)

### Community 8 - "Session Restoration Tests"
Cohesion: 0.17
Nodes (11): IntersectionObserverMock, session, mapApiUser(), keys, storage, AuthSession, Group, MainScreen (+3 more)

### Community 9 - "PWA Architecture"
Cohesion: 0.14
Nodes (14): Offline Data Honesty, PWA Migration Boundary, ConnectivityStatus, Explicit Cache Warmup, Offline Snapshot, PWA Architecture, PwaRegistrar, PWA Execution Plan (+6 more)

### Community 10 - "Playwright Test Helpers"
Cohesion: 0.35
Nodes (7): DnjTheme, enterMainExperience(), openDnj(), openMainScreen(), Baseline, baselines, expectBaseline()

### Community 11 - "HTTP API Client"
Cohesion: 0.27
Nodes (6): ApiError, ApiErrorCode, apiRequest(), RequestOptions, response(), env

### Community 12 - "PWA Icon Generation"
Cohesion: 0.31
Nodes (6): generatePwaIcons(), loadOfficialLogo(), pngTargets, renderSquare(), allOutputs, pngOutputs

### Community 13 - "Application Screens"
Cohesion: 0.22
Nodes (9): AccountScreen(), animStyle(), GroupScreen(), HomeScreen(), LoginScreen(), QueueScreen(), RegisterScreen(), requestErrorMessage() (+1 more)

### Community 14 - "Service Worker Build"
Cohesion: 0.46
Nodes (5): buildServiceWorker(), resolveRevision(), sanitizeRevision(), temporaryDirectories, writeFileAtomic()

### Community 15 - "App Layout and Manifest"
Cohesion: 0.36
Nodes (4): metadata, poppins, viewport, manifest()

### Community 16 - "Network Status Hook"
Cohesion: 0.39
Nodes (6): createNetworkStore(), getServerSnapshot(), NetworkStatus, SERVER_SNAPSHOT, Probe(), useNetworkStatus()

### Community 17 - "Authentication and Groups API"
Cohesion: 0.39
Nodes (5): authApi, ApiGroup, ApiUser, VerificationResponse, groupsApi

### Community 18 - "Install Promotion Design"
Cohesion: 0.40
Nodes (5): Compact Install Promotion, Seven-Day Install Snooze, Chromium Install Flow, iOS Manual Install Flow, Progressive Install Enhancement

### Community 19 - "Frontend Authentication Architecture"
Cohesion: 0.40
Nodes (5): Cookie Session Reconstruction, Frontend Architecture, Versioned Local Session, API Authentication Contract, DNJ Frontend Stack

### Community 20 - "Validation Lessons"
Cohesion: 0.50
Nodes (4): Install Promotion Verification, Session-Stable Install State, Direct Persistence Side-Effect Assertions, Terminal Client Lifecycle Guards

### Community 21 - "PWA Feature Requirements"
Cohesion: 0.50
Nodes (4): Installable PWA, Offline Shell Resilience, Safe Vercel Updates, Safe PWA Update Activation

### Community 22 - "App Icon 192"
Cohesion: 0.50
Nodes (4): 2K26 CWB Badge, DNJ Game App Icon, White DNJ Monogram, Orange Brand Field

### Community 23 - "App Icon 512"
Cohesion: 0.50
Nodes (4): 2K26 CWB Badge, DNJ Game App Icon, White DNJ Monogram, Orange Brand Field

### Community 24 - "Maskable App Icon"
Cohesion: 0.50
Nodes (4): 2K26 CWB Badge, Centered White DNJ Monogram, Maskable DNJ App Icon, Orange Maskable Safe Area

### Community 25 - "Apple Touch Icon"
Cohesion: 0.50
Nodes (4): 2K26 CWB Badge, DNJ Apple Touch Icon, White DNJ Monogram, Orange Brand Field

### Community 26 - "Application Icon"
Cohesion: 0.50
Nodes (4): 2K26 CWB Badge, DNJ Application Icon, White DNJ Monogram, Orange Brand Field

### Community 27 - "Primary Brand Lockup"
Cohesion: 0.50
Nodes (4): 2K26 CWB Badge, DNJ Game Brand Lockup, Green DNJ Monogram, Orange GAME Wordmark

### Community 28 - "Composite Brand Logo"
Cohesion: 0.50
Nodes (4): 2K26 CWB Badge, DNJ Game Composite Logo, Lime DNJ Monogram, Cyan GAME Wordmark

### Community 29 - "Game and Ranking"
Cohesion: 0.50
Nodes (4): GameScreen(), GROUP_RANKING, INDIVIDUAL_RANKING, useCountUp()

### Community 30 - "Product Vision"
Cohesion: 0.67
Nodes (3): DNJ Game 2K26 Product, Mobile Event Participant, Progressive Offline Experience

### Community 32 - "Primary White Logo"
Cohesion: 0.67
Nodes (3): 2K26 CWB Badge, DNJ Monogram, White DNJ Primary Logo

### Community 33 - "Cyan Game Logo"
Cohesion: 0.67
Nodes (3): Cyan GAME Logo, Stacked GAME Wordmark, Open Rounded Square Frame

### Community 34 - "Large White Logo"
Cohesion: 0.67
Nodes (3): 2K26 CWB Badge, DNJ Monogram, Oversized White DNJ Logo

### Community 35 - "Alternate White Logo"
Cohesion: 0.67
Nodes (3): 2K26 CWB Badge, DNJ Monogram, Oversized White DNJ Logo

## Knowledge Gaps
- **158 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `predev` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Development Dependencies` to `Package Scripts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Scripts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Service Worker Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.06028368794326241 - nodes in this community are weakly interconnected._
- **Should `Development Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `PWA UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.09047619047619047 - nodes in this community are weakly interconnected._
- **Should `Main Application State` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._