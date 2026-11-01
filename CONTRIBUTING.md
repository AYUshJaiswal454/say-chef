# Contributing to Say Chef

Thanks for helping. Whether you're adding your grandmother's recipe, a new cuisine, a voice phrase, or a smart-speaker integration, this guide gets you from clone to merged pull request.

## Ground rules

- Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Keep pull requests focused: one feature or fix per PR is easiest to review.

## Set up

You need Node.js 20.19 or newer.

```bash
git clone https://github.com/<your-username>/say-chef.git
cd say-chef
npm install
npm run dev
```

The app starts in **demo mode**, with no Firebase project needed. Recipes, reviews and favourites are saved in your browser. To work on Firebase features, follow [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) or use the emulators (`npx firebase-tools emulators:start`).

Before you push, run the same checks as CI:

```bash
npm run check   # typecheck + lint + unit tests
npm run build
```

If you change `firestore.rules`, also run the rules tests (they need Java 21):

```bash
cd tests/rules && npm install && npm test
```

## Good first contributions

### Adding a cuisine

Open [`src/data/cuisines.ts`](src/data/cuisines.ts) and add an entry, choosing the plate illustration that suits it:

```ts
{ name: 'Vietnamese', plate: 'herb' },
```

Plates: `curry`, `tomato`, `herb`, `glaze`, `skillet`, `kimchi`, `greens`, `noodle`, `stack`, `chickpea`, `chai`, `cocoa`. Cuisine names are limited to 40 characters by `firestore.rules`.

### Adding a starter recipe

Add an object to [`src/data/starterRecipes.ts`](src/data/starterRecipes.ts). A few tips so it cooks well hands-free:

- Start each ingredient with its amount: `1½ cups basmati rice, rinsed`, `200 g paneer, cubed`, `Salt, to taste`.
- Write steps the way you'd say them, and include times: "Simmer for 10 minutes until thick."
- Name ingredients in steps the way the list does, so cooking mode can show what each step uses.
- Give it a unique kebab-case `id`.

Run `npm test` afterwards; the demo store's tests load every starter recipe.

### Teaching the voice parser

Voice commands are matched in [`src/lib/voice/commands.ts`](src/lib/voice/commands.ts). To support a new way of saying something:

1. Add a case to [`commands.test.ts`](src/lib/voice/commands.test.ts) first, for example `expect(type('carry on')).toBe('next')`.
2. Extend the pattern in `parseCommand` until it passes, and check the other tests still pass. Order matters: more specific patterns come first.
3. If it's a new command, add it to `COMMAND_HELP` and handle it in `doCommand` in [`CookPage.tsx`](src/pages/CookPage.tsx).

## Code guidelines

- **TypeScript, strict.** No `any`; prefer narrow types and pure functions.
- **Logic in `src/lib`, with tests.** Anything that can be a pure function (parsing, scaling, matching) lives there with a `*.test.ts` beside it.
- **Storage through `DataSource`.** Pages never call Firebase directly. A new data operation goes in the interface and both implementations (`localSource.ts` and `firestoreSource.ts`), and in `firestore.rules` if it writes something new.
- **Styling through tokens.** Use Tailwind classes built from the tokens in `src/index.css` (`bg-surface`, `text-muted`, `border-line`…), never raw colours, so light and dark modes both work.
- **Accessible by default.** Every control needs a visible label or `aria-label`, works with the keyboard, and shows focus. Cooking mode must stay usable without a microphone.
- **Plain words in the UI.** Short, direct sentences. Buttons say what they do ("Publish recipe"), errors say what went wrong and what to do.
- Run `npm run format` to format with Prettier.

## Commits and pull requests

- Write commit messages in the imperative: "Add Vietnamese cuisine", "Fix timer not ringing after pause".
- Fill in the pull request template, including how you tested it. Screenshots or a short screen recording help a lot for UI changes.
- CI must pass. A maintainer will review, may suggest changes, and will merge when it's ready.

## Reporting bugs and ideas

Use the [issue templates](https://github.com/AYUshJaiswal454/say-chef/issues/new/choose). For voice bugs, include your browser and what you said versus what Say Chef heard (cooking mode shows the transcript).

Security problems: please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
