# Roadmap

Ideas that would make Say Chef better, roughly from easiest to most ambitious. Open an issue before starting something large so we can agree on the approach. Items marked **good first issue** need no knowledge of the rest of the codebase.

## Cuisines and recipes

- [ ] **Add more cuisines** (good first issue): Vietnamese, Ethiopian, Peruvian, Turkish, Caribbean, Bengali, Kerala… one entry each in `src/data/cuisines.ts`.
- [ ] **More starter recipes** (good first issue), especially for cuisines with none yet.
- [ ] New plate illustration styles in `src/lib/plateArt.ts` (a bowl of soup, a salad, a cake slice).
- [ ] Recipe photos with Firebase Storage, falling back to the plate illustration.
- [ ] Import a recipe from a URL that publishes schema.org `Recipe` data.
- [ ] Unit conversion between metric and US measures.

## Personalised recommendations

- [ ] "Because you saved…" suggestions based on cuisines and ingredients you save and rate.
- [ ] Pantry memory: keep what's in your kitchen and suggest what to cook tonight.
- [ ] Dietary profile that pre-filters every list.
- [ ] Weekly meal planner with a combined shopping list.

## Voice

- [ ] **Teach the parser new phrases** (good first issue) with tests in `commands.test.ts`.
- [ ] Voice commands in more languages (Hindi, Spanish, French…) with a language picker.
- [ ] Optional wake word so the mic can stay on without reacting to conversation.
- [ ] "Pause the timer" and "add a minute" by voice.
- [ ] Read a different recipe's step when two dishes are cooking at once.

## Smart kitchen

- [ ] A Google Home / Alexa skill that reads Say Chef recipes.
- [ ] Send timers to a smartwatch or phone notification.
- [ ] Oven and smart-plug integrations (for example through Home Assistant) to preheat from a step.

## Platform

- [ ] Offline support with a service worker, so a saved recipe opens with no connection.
- [ ] Recipe moderation in the app: an admin role, reporting, and removing reviews with the totals kept in step.
- [ ] Move rating totals to a Cloud Function for stricter guarantees.
- [ ] Public profile pages for cooks.
- [ ] End-to-end tests with Playwright in CI.
- [ ] Translations of the interface.
