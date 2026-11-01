# Security policy

## Reporting a vulnerability

Please don't open a public issue for security problems. Instead, use GitHub's private vulnerability reporting: open the repository's **Security** tab and click **Report a vulnerability**. If that isn't available, contact the maintainer through their [GitHub profile](https://github.com/AYUshJaiswal454).

Include what you found, how to reproduce it, and what an attacker could do with it. You'll get a reply within a week, and a fix or a plan as soon as the problem is confirmed.

## Scope

The most important parts to get right are:

- [`firestore.rules`](firestore.rules): anything that lets someone edit another cook's recipe, fake ratings, or read another cook's favourites.
- Rendering of user content: recipes and reviews are shown as text and must never be interpreted as HTML.

The Firebase web config in `.env.local` is public by design (it identifies the project to browsers); the security rules are what protect the data.

## Supported versions

Only the latest version on `main` receives fixes.
