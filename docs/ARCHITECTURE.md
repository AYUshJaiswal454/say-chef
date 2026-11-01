# Architecture

Say Chef is a single-page React app. It has no backend of its own: in Firebase mode the browser talks directly to Firebase Auth and Cloud Firestore, protected by security rules; in demo mode everything lives in `localStorage`.

## Layers

```
pages/  ──►  state/  ──►  lib/data (DataSource)  ──►  Firestore  or  localStorage
  │            │
  │            └──► state/timers  ──► lib/sound, lib/voice/speech
  │
  └──► lib/recipe (pure functions: durations, quantities, matching, speech text, validation)
  └──► lib/voice  (speech synthesis, recognition, command grammar)
```

- **`lib/`** holds plain TypeScript with no React. Everything that can be a pure function is one, with unit tests beside it.
- **`state/`** holds the React providers: data and auth (`app.tsx`), kitchen timers (`timers.tsx`), voice preferences and theme (`prefs.ts`), and toasts.
- **`pages/`** are the five screens. `App.tsx` picks one from the URL.

## The DataSource interface

[`src/lib/data/types.ts`](../src/lib/data/types.ts) defines everything the UI needs from storage: auth, live recipe and review subscriptions, create/update/delete, reviews and favourites. There are two implementations:

| | `localSource.ts` (demo) | `firestoreSource.ts` (Firebase) |
| --- | --- | --- |
| Chosen when | No `VITE_FIREBASE_*` config | Config present |
| Auth | Always signed in as "You" | Google sign-in (popup, falling back to redirect) |
| Storage | One JSON document in `localStorage`, synced across tabs | Firestore with a persistent multi-tab cache |
| Ratings | Recalculated from reviews | Transaction updates `ratingSum` / `ratingCount` |

[`src/lib/data/index.ts`](../src/lib/data/index.ts) picks one at startup and loads the Firebase SDK with a dynamic `import()`, so demo mode never downloads it. Adding another backend (Supabase, a REST API) means writing one more `DataSource`.

## Data model and rules

See the [data model](FIREBASE_SETUP.md#data-model). The rules in [`firestore.rules`](../firestore.rules) enforce:

- Anyone can read recipes and reviews. Favourites are private.
- A recipe's `authorId` must be the signed-in cook, and only they can edit or delete it. Edits can't touch authorship or rating totals.
- Every field is type- and length-checked, matching the limits in [`validate.ts`](../src/lib/recipe/validate.ts).
- A review is keyed by its author's uid, can't be for your own recipe, and must be written in the same transaction as a change to the recipe's totals that matches it exactly (`getAfter` compares the totals before and after).

[`tests/rules`](../tests/rules) checks each of these against the Firestore emulator.

## Cooking mode

[`CookPage.tsx`](../src/pages/CookPage.tsx) is the heart of the app. Per step it:

1. Cancels anything still pending from the last step (a run counter invalidates old speech and countdowns).
2. Reads the step with `tts.speak()`, which resolves `true`, `false` or `'interrupted'`.
3. If autoplay is on and the speech wasn't interrupted, starts the step's first timer, or starts a countdown to the next step.

Timers live in [`state/timers.tsx`](../src/state/timers.tsx) at the top of the app, so they survive leaving cooking mode. A timer remembers its recipe, step and which time in the step it belongs to (`seq`), which is how "start timer" knows to start the step's *second* time when the first is already running, and how autoplay chains them.

Voice input goes through a ref to the latest command handler, so the long-lived speech recognition session always acts on the current step without restarting.

## Text understanding

All in [`src/lib/recipe`](../src/lib/recipe), all pure and tested:

- **`durations.ts`** finds times in prose: digits, words ("fifteen"), fractions ("1½", "1 1/2"), ranges ("8-10", upper bound wins) and "half an hour". It ignores temperatures and quantities.
- **`quantities.ts`** reads the amount at the start of an ingredient line and rescales it, formatting results as kitchen fractions and rounding metric weights to the nearest 5.
- **`matching.ts`** links steps to the ingredients they mention (handling plurals and "or" alternatives), answers "how much X", and scores pantry matches.
- **`speechText.ts`** rewrites abbreviations and fractions for speech synthesis.

## Styling

Tailwind CSS v4 with tokens defined once in [`src/index.css`](../src/index.css): every colour is a CSS variable with light and dark values, mapped into Tailwind with `@theme inline`, so components only ever use names like `bg-surface` and `text-muted`. The theme follows the device unless the cook picks one; the choice is applied before first paint by a tiny script in `index.html`.

The plate illustrations are drawn by [`plateArt.ts`](../src/lib/plateArt.ts): a seeded random generator turns a recipe id into a stable SVG, so every recipe has a picture without image hosting.

## Routing

[`router.tsx`](../src/lib/router.tsx) is a small History API router with `Link`, `useRouter` and `matchPath`. Paths are relative to Vite's `BASE_URL`, so the same build works at a domain root and under `/say-chef/` on GitHub Pages, where the deploy workflow copies `index.html` to `404.html` to serve deep links.

| Path | Screen |
| --- | --- |
| `/` | Browse, search and filter |
| `/recipes/:id` | Recipe with reviews |
| `/recipes/:id/cook?serves=6` | Cooking mode |
| `/recipes/:id/edit` | Edit (author only) |
| `/new` | New recipe |
