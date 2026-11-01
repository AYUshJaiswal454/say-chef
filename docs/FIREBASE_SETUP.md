# Setting up Firebase

Say Chef runs in **demo mode** until you give it a Firebase project: recipes, reviews and favourites stay in your browser. Connecting Firebase lets everyone who opens your site share recipes, sign in with Google and review each other's cooking. Firebase's free Spark plan covers everything Say Chef uses.

## 1. Create the project

1. Go to the [Firebase console](https://console.firebase.google.com) and click **Create a project**. Google Analytics is optional; Say Chef doesn't use it.
2. In **Project overview**, click the **Web** icon (`</>`) to add a web app. Give it a nickname such as `say-chef`. You don't need Firebase Hosting yet.
3. Firebase shows a `firebaseConfig` object. Keep this tab open for step 3.

## 2. Turn on sign-in and the database

1. **Authentication** → **Get started** → **Sign-in method** → enable **Google**, choose a support email, and save.
2. **Firestore Database** → **Create database**. Pick a location near your cooks, and start in **production mode** (the rules in this repo will open exactly what's needed).

## 3. Connect the app

Copy the example env file:

```bash
cp .env.example .env.local
```

Fill it in from the `firebaseConfig` object:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

These values identify your project to the browser; they are not secrets. What keeps your data safe is the security rules in the next step.

## 4. Deploy the security rules

The rules in [`firestore.rules`](../firestore.rules) let anyone read recipes and reviews, let signed-in cooks add recipes, let only authors edit or delete them, and make sure rating totals always match the reviews.

```bash
npx firebase-tools login
npx firebase-tools use --add          # pick your project
npx firebase-tools deploy --only firestore
```

Until the rules are deployed, Firestore's production mode blocks every read and the app shows "Couldn't open the cookbook".

## 5. Try it

```bash
npm run dev
```

Click **Sign in**, then **Add 12 starter recipes** on the empty cookbook. Open the site in a private window with a different Google account to try reviews: cooks can't review their own recipes.

## 6. Authorised domains

Google sign-in only works on domains Firebase knows about. `localhost` is allowed by default. When you deploy, add your site's domain in **Authentication** → **Settings** → **Authorised domains**, for example:

- `your-name.github.io` for GitHub Pages
- `say-chef.onrender.com` (or whatever address Render gives your site) for Render
- `your-project.web.app` is added automatically for Firebase Hosting

If you see "This site is not on the Firebase project's list of authorised domains yet", this is the step to check.

## Deploying with Firebase config

**GitHub Pages.** The deploy workflow reads the same six values from repository variables. In your GitHub repo open **Settings** → **Secrets and variables** → **Actions** → **Variables** and add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` and `VITE_FIREBASE_APP_ID`. The next push to `main` deploys a shared cookbook.

**Firebase Hosting.**

```bash
npm run build
npx firebase-tools deploy
```

## Testing the rules locally

The rules have their own test suite that runs against the Firestore emulator. It needs Java 21.

```bash
cd tests/rules
npm install
npm test
```

CI runs the same tests on every pull request.

## Data model

```
recipes/{recipeId}
  title, description, cuisine, difficulty, prepMinutes, cookMinutes, servings,
  diet[], ingredients[], steps[], notes, plate,
  authorId, authorName, authorPhoto, createdAt, updatedAt,
  ratingCount, ratingSum, starter

recipes/{recipeId}/reviews/{authorId}
  authorId, authorName, authorPhoto, rating (1-5), text, createdAt, updatedAt

users/{uid}/favorites/{recipeId}
  savedAt
```

Reviews are keyed by the author's uid, so each cook has one review per recipe. Writing a review runs a transaction that also updates `ratingSum` and `ratingCount`, and the rules reject the write unless those totals change by exactly the review's rating. That keeps averages cheap to show on every recipe card.

## Moderation

Reviews can be removed by their author. To remove someone else's review or recipe, delete it in the Firebase console. If you remove a review there, also lower the recipe's `ratingSum` by its rating and `ratingCount` by 1. Moving moderation into the app (for example with an admin role or a Cloud Function) is on the [roadmap](ROADMAP.md).
