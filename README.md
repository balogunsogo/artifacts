# Artifacts — Interaction Archive

Artifacts is a growing collection of reusable interactions, motion studies and digital experiments by Oluwasogo Balogun. The initial six-artifact collection is fully implemented, with a shared archive shell, typed metadata registry, real homepage previews, and isolated interaction modules.

## Technology

The project uses Next.js App Router, React, TypeScript, SCSS Modules, GSAP, and `next/image`. It is a static experience and does not require a database, authentication, or environment variables.

## Local setup

Install Node.js and npm, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.

## Commands

```bash
npm run dev        # local development
npm run lint       # ESLint
npm run typecheck  # TypeScript without emitting files
npm run build      # production build
npm start          # run the production build
```

## Structure

```text
src/
├── app/                    # App Router pages, metadata and global styles
├── artifacts/              # Registry, helpers and isolated artifact modules
├── components/             # Archive shell and shared preview components
├── hooks/                  # Documented client-only GSAP pattern
└── styles/                 # Global tokens, reset, mixins and utilities
```

## Registry and routes

`src/artifacts/artifact.data.ts` is the server-safe source of truth. Each entry satisfies the `Artifact` type in `artifact.types.ts`. `artifact.utils.ts` provides slug lookup, wrapping previous/next navigation, and count formatting. The single dynamic route at `src/app/artifacts/[slug]/page.tsx` statically generates every registered artifact.

The six published artifacts are:

1. Block Orbit
2. Split Menu
3. Scroll Cinema
4. Ambient Artwork
5. Palette Shift
6. Track Transition

To add an artifact:

1. Add a typed record to `artifact.data.ts`.
2. Add an isolated directory under `src/artifacts/<slug>/`.
3. Build its component and SCSS Module there.
4. Add its lightweight abstract preview to `ArtifactVisual` only if it needs to appear on the index before the real preview is suitable.
5. Connect the component in `ArtifactStage` when its extraction is ready.

## Extraction destinations

Insert the future source interactions into these exact modules (and add a colocated `*.module.scss` beside each):

- `src/artifacts/block-orbit/BlockOrbitArtifact.tsx`
- `src/artifacts/split-menu/SplitMenuArtifact.tsx`
- `src/artifacts/scroll-cinema/ScrollCinemaArtifact.tsx`
- `src/artifacts/ambient-artwork/AmbientArtworkArtifact.tsx`
- `src/artifacts/palette-shift/PaletteShiftArtifact.tsx`
- `src/artifacts/track-transition/TrackTransitionArtifact.tsx`

## Motion foundation

GSAP and `@gsap/react` are installed for artifact-level motion. `src/hooks/use-artifact-gsap.ts` demonstrates client-only `useGSAP`, scoped selectors, automatic context cleanup, and reduced-motion matching. Lenis is installed for possible artifact experiments but deliberately not initialized globally: the archive keeps native scrolling, accessibility, and a simple rendering model until a concrete interaction justifies smooth scrolling.

## Isolation rules

1. Every artifact owns its markup, styles and client-side logic.
2. Artifact styles use SCSS Modules; selectors never leak globally.
3. Global styles are limited to resets, tokens and shell utilities.
4. Every artifact cleans up listeners, animation frames, observers, timers and GSAP contexts.
5. Every artifact supports reduced motion.
6. Browser-only APIs stay inside client components or effects.
7. Artifact components accept configuration through typed props where practical.
8. Project content and assets are not hard-coded into reusable interaction logic.
9. Each artifact should work on its detail page and as a lightweight index preview.

No environment variables or secrets are required.

## Published artifact: Block Orbit

Block Orbit was extracted from the Toby & Tye Creative Block scene. Its React-safe implementation lives in `src/artifacts/block-orbit/BlockOrbitArtifact.tsx`, with fully isolated styles in the colocated SCSS Module and its three source images in `public/artifacts/block-orbit/`.

The same typed component supports `mode="full"` on the artifact page and a lighter `mode="preview"` inside the homepage card. A CSS animation preserves the original 16-second Y-axis rotation, while component-scoped GSAP smoothing adds restrained pointer tilt only for fine pointers. An `IntersectionObserver`, the Page Visibility API, and the local reduced-motion media query pause or disable motion as appropriate. Cleanup disconnects the observer, removes document, media-query, and pointer listeners, and kills component-owned GSAP tweens and contexts.

The PNG source files are intentionally preserved rather than converted: the cube uses six transformed `next/image` faces, cycling the three original images twice without importing Toby & Tye fonts or global styles.

## Published artifact: Ambient Artwork

Ambient Artwork isolates the artwork-depth interaction from the Spotify Now Playing project. The component and its SCSS Module live in `src/artifacts/ambient-artwork/`, while the shared eight-track registry points exclusively to same-origin JPEGs in `public/artifacts/music-covers/`. Spotify authentication, APIs, polling, and remote image hosts are not required.

The component shares one implementation across `preview` and `full` modes. Fine-pointer capability enables RAF-smoothed tilt, lift, depth shadow, and reflection tracking; coarse pointers receive a stable composition with the optional playing-state drift. The full mode includes a restrained Playing/Paused button, while the linked homepage preview has no nested control and defaults to Playing.

Intersection and Page Visibility checks pause nonessential motion outside the viewport or in a hidden tab. Reduced motion disables tilt, drift, reflection movement, and nonessential transitions. Cleanup disconnects the observer, removes pointer, document, and media-query listeners, and cancels any active animation frame without creating global state.

## Published artifact: Split Menu

Split Menu isolates the full-screen menu study from Toby & Tye. Its shared React component and scoped SCSS Module live in `src/artifacts/split-menu/`, with the four original panel images copied unchanged to `public/artifacts/split-menu/`. The extraction intentionally leaves behind the source site's fonts, logo, video controller, smooth-scrolling setup, hash navigation, and header-theme behavior.

The homepage uses the component's contained `preview` mode directly inside the existing artifact link, so it introduces no nested buttons or dialog. The detail route uses `full` mode: a native modal dialog opens with the original right-to-left wipe, header fade, and staggered card reveal. Close, Escape, or choosing a card runs the custom exit sequence; focus moves to Close when opening and returns to the trigger afterward. A local live status reports the selected section.

Fine pointers retain stable measured lanes while the hovered or keyboard-focused card expands, neighboring cards mute, artwork scales, and labels appear. Coarse pointers receive a vertically scrollable menu whose center card is emphasized with a dialog-rooted `IntersectionObserver`; landscape layouts may use two columns. Body scroll locking restores the previous inline styles and exact scroll position, reduced motion resolves state changes immediately, and teardown removes observers, listeners, animation frames, and GSAP work.

## Published artifact: Palette Shift

Palette Shift extracts the colour-atmosphere system from the Spotify Now Playing source without carrying over its player interface or service integration. The shared preview/full component and scoped styles live in `src/artifacts/palette-shift/`; its framework-independent colour logic lives in `src/artifacts/_shared/music/palette.ts`. It uses four entries from the shared local artwork registry and requires no Spotify API, authentication, remote artwork, polling, or environment configuration.

Each artwork is anonymously preloaded and decoded before a 32-by-32 canvas samples every fourth pixel. Transparent, very dark, and nearly white pixels are ignored; average and high-saturation candidates are then clamped to restrained base and accent luminance ranges. Successful results enter a small FIFO cache, failures use the default palette, and generation plus abort guards prevent older requests from replacing a newer selection. Colour and foreground variables are applied only to the artifact root.

Full mode provides four accessible artwork buttons and crossfades both the sharp foreground artwork and two blurred ambient buffers, clearing the outgoing buffer after the transition. The control-free homepage preview cycles every five seconds only while visible, the document is active, and reduced motion is not requested. Reduced motion changes artwork without the large bloom. Teardown aborts image work, cancels frames, intervals, and transition timers, disconnects the visibility observer, and removes document and media-query listeners.

## Published artifact: Scroll Cinema

Scroll Cinema extracts the scroll-to-expand Gamp video study from Toby & Tye. Its shared full/preview component and isolated styles live in `src/artifacts/scroll-cinema/`, while the unchanged desktop and mobile MP4s live in `public/artifacts/scroll-cinema/`. The extraction removes the source menu, header-theme events, global classes, hash navigation, Lenis attributes, and site-wide overlay coordination.

Full mode uses a route-specific stage that can grow with ScrollTrigger pin spacing before releasing into the existing information and previous/next navigation. A scoped GSAP timeline measures the starting 16:9 frame and available stage dimensions, then scrubs toward the larger cover scale with the source's 1.015 overscan. Desktop uses approximately 1.8 viewport heights; native-touch layouts use a stable measured height and the shorter 1.15 distance. Width and orientation changes schedule a settled refresh, while insignificant mobile browser-chrome height changes are ignored.

The muted ambient video plays only while meaningfully visible, the document is active, reduced motion is off, and cinema is closed. Cinema uses a separate React-owned video inside a native modal dialog, preserving the ambient time without moving DOM nodes. It provides Close and event-synchronised Play/Pause controls, user-gesture sound, exact scroll restoration, and focus restoration. Preview mode uses the same responsive sources without ScrollTrigger, buttons, or a dialog. Reduced motion removes pinning and artificial scroll distance. Cleanup kills the local trigger and timeline, clears timers and frames, removes viewport, visibility, media, and dialog listeners, pauses both videos, closes the dialog, and restores scroll state.

## Published artifact: Track Transition

Track Transition isolates the artwork, metadata, title, palette, and ambient choreography from the Spotify Now Playing source without adding Spotify APIs or audio playback. Its shared preview/full component and scoped styles live in `src/artifacts/track-transition/`. Full mode uses all eight local registry entries, while the homepage preview cycles through its assigned three-track subset. Palette loading, Canvas sampling, clamping, fallback, and caching live in `src/artifacts/_shared/music/palette.ts`.

The component follows explicit idle, preparing, departing, committing, and arriving phases. Incoming artwork is anonymously preloaded, decoded, and palette-processed while the current scene remains visible. After the source-aligned 180ms departure, React atomically commits artwork, fictional metadata, position, active ambient buffer, and root-scoped palette variables. The arrival restores artwork depth, reveals metadata, and renders the complete accessible title alongside decorative word spans animated for 420ms with a 26ms capped stagger. The outgoing ambient layer remains until the 900ms cleanup.

Every request increments a generation token, aborts older image work, clears its midpoint and cleanup tasks, and replaces the single pending target, so rapid controls resolve deterministically to the latest selection. The control-free preview uses the same transition system and cycles every five seconds only while visible, active, and motion is allowed. Reduced motion disables cycling, departure staging, word motion, bloom, and long crossfades while retaining immediate manual transitions and colour updates. Teardown aborts preparation, invalidates generations, clears timers and frames, disconnects observers, and removes visibility and media-query listeners.

## Artwork attribution

Album artwork belongs to the respective artists and rights holders and is presented here as contextual interface content.
