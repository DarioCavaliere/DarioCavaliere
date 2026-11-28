# Launching the Dado website

Everything below the "Your steps" line is ready in this repository. Nothing is public yet: the site only goes live when you run the deploy workflow by hand.

## What's ready

- **A public page for every recipe (153)** at `https://<your-domain>/recipes/<recipe-name>/`, for example `/recipes/spaghetti-alla-carbonara/`. Each page has:
  - the boxed photo, title, summary, time, servings, calories, kitchen, course, diet and allergens
  - the ingredients and every method step written into the page (readable by Google without running any code)
  - **Schema.org Recipe** data: name, description, three image sizes (1:1, 4:3, 16:9), ingredients, numbered steps, total time, servings, cuisine, category, calories, vegetarian/vegan diet
  - breadcrumb data (Dado › Recipes › Italian › Carbonara)
  - title, description and canonical link
  - **Open Graph and Twitter/X tags** with the dish's own 1200×630 photo, so WhatsApp, Facebook, LinkedIn, Pinterest and X show a proper preview
  - "Add to shopping list" (shares the list with the app in the same browser) and "Share recipe"
  - links to four related recipes from the same kitchen
- **`/recipes/`**: every recipe grouped by kitchen, so search engines can find them all.
- **The app at `/`** (moods, dials, shopping list, What's in your kitchen?, favourites). On the public site its recipe cards and share buttons use the new recipe pages, and features that only work inside Claude (sign-in, "Share a recipe", shared recipes) are hidden.
- **`sitemap.xml`** (all pages, with images), **`robots.txt`**, a **404 page**, **favicons and app icons** made from the logo, and a web app manifest.
- **A deploy workflow** (`.github/workflows/deploy-site.yml`) for free hosting on GitHub Pages.

## Your steps

### 1. Buy the domain
Any registrar works (Cloudflare, Namecheap, Porkbun, Google/Squarespace Domains…). Check that `dadofood.com` or your preferred name is free.

### 2. Tell the site its address
Edit `site/site.config.json` and set `"siteUrl"` to your real address, for example `"https://dadofood.com"`. (Or, in GitHub, add a repository variable `SITE_URL`: Settings → Secrets and variables → Actions → Variables.)

### 3. Turn on GitHub Pages
In the GitHub repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

If you'd rather keep the website in its own repository (recommended, since this one is your profile repository), create a new repository and copy in: `index.html`, `assets/` (only `assets/food/*.webp` and `assets/logo-artboard-6-original.png` are needed), `site/` and `.github/workflows/deploy-site.yml`.

### 4. Publish
**Actions → Deploy Dado website → Run workflow.** It takes about two minutes. The first time, GitHub shows the site at `https://<your-username>.github.io/...` until the domain is connected.

### 5. Connect the domain
At your registrar, add these DNS records:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | `<your-github-username>.github.io` |

Then in **Settings → Pages**, enter the domain under **Custom domain**, wait for the DNS check, and tick **Enforce HTTPS**. (GitHub can take up to a day to issue the certificate.) It's worth also verifying the domain under your GitHub account's **Settings → Pages**, which stops anyone else claiming it.

### 5b. Switch on the contact form
The Contact page (menu → Contact us) sends messages through a form service, so your email address never appears on the site.
1. Create a free account at [Formspree](https://formspree.io) (or a similar service such as Web3Forms) with the email address where you want to receive messages.
2. Create a form and copy its endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
3. Paste it into `site/site.config.json` as `"contactEndpoint"`, then run the deploy workflow again.
4. Send yourself a test message from the live site. (Formspree asks you to confirm the first one by email.)

Until then the form politely says it isn't connected yet.

### 6. Tell Google
1. Open [Google Search Console](https://search.google.com/search-console), add a **Domain** property for your domain and verify it with the DNS TXT record it gives you.
2. Under **Sitemaps**, submit `https://<your-domain>/sitemap.xml`.
3. Under **URL inspection**, request indexing for the home page and a few recipes to speed things up.

### 7. Check the previews
- [Rich Results Test](https://search.google.com/test/rich-results): paste a recipe URL; it should find a valid **Recipe**.
- [Schema Markup Validator](https://validator.schema.org/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (also refreshes WhatsApp/Instagram previews)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- Send yourself a recipe link on WhatsApp.

## Updating recipes later
1. Change recipes in the app (`index.html`) as usual.
2. Run `node site/tools/export-recipes.mjs` to refresh `site/data/recipes.json` (needs Playwright: `npm i -D playwright && npx playwright install chromium`).
3. Run the deploy workflow again.

To preview locally: `node site/tools/build.mjs && python3 site/tools/make-images.py site/dist`, then `cd site/dist && python3 -m http.server 8000` and open http://localhost:8000.

## Worth deciding before going public
- **Recipes shared by visitors.** "Share a recipe", sign-in and photo uploads use Claude's built-in storage, so they're switched off on the public site. Bringing them back needs a small backend (for example Supabase or Firebase) and moderation.
- **Saved data.** Favourites, the shopping list and your kitchen ingredients are kept in each visitor's browser (no accounts, no syncing between devices).
- **Privacy.** The site sets no cookies and has no analytics. It loads fonts from Google Fonts; in the EU some sites self-host fonts instead to avoid sending visitors' IP addresses to Google. If you add analytics later, you'll likely need a cookie notice and a privacy page.
- **Legal pages.** Depending on your country, a privacy policy and an imprint/contact page may be required.
- **Photos.** Every recipe page keeps the note that food images are visual representations of the recipe.
