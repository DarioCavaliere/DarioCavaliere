// Builds the public Dado website into site/dist (no dependencies, Node 18+).
//   node site/tools/build.mjs            uses site/site.config.json
//   SITE_URL=https://example.com node site/tools/build.mjs   overrides the domain
// Then run:  python3 site/tools/make-images.py site/dist   to add the images and icons.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = path.join(ROOT, "site");
const DIST = path.join(SITE, "dist");
const cfg = JSON.parse(readFileSync(path.join(SITE, "site.config.json"), "utf8"));
const BASE = ((process.env.SITE_URL || "").trim() || cfg.siteUrl).replace(/\/+$/, "");
const recipes = JSON.parse(readFileSync(path.join(SITE, "data/recipes.json"), "utf8"));
const today = new Date().toISOString().slice(0, 10);

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slugify = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const iso = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), r = m % 60; return "PT" + (h ? h + "H" : "") + (r || !h ? r + "M" : ""); };
const fmtTime = m => m < 60 ? m + " min" : `${Math.floor(m / 60)} h${m % 60 ? " " + (m % 60) + " min" : ""}`;
const abs = p => BASE + p;
const write = (rel, content) => { const f = path.join(DIST, rel); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, content); };
const clip = (s, n) => (s = String(s || "").replace(/\s+/g, " ").trim()).length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;

const seen = new Set();
for (const r of recipes){
  let s = r.slug || slugify(r.title), i = 2; while (seen.has(s)) s = `${r.slug || slugify(r.title)}-${i++}`;
  seen.add(s); r.slug = s; r.url = `/recipes/${s}/`;
}
const ALG = {Gluten:"gluten",Dairy:"milk",Egg:"egg",Nuts:"treenuts",Peanuts:"peanut",Soy:"soy",Fish:"fish",Crustaceans:"crustaceans",Molluscs:"molluscs",Sesame:"sesame",Celery:"celery",Mustard:"mustard",Sulphites:"sulphites",Lupin:"lupin"};
const KITCHEN_ORDER = ["Italian", "Japanese", "Mexican", "Indian", "Middle Eastern", ""];
const kitchenSlug = k => k ? slugify(k) : "everyday";
const kitchenLabel = k => k || "Everyday";

/* ---------- shared head ---------- */
function head({ title, description, url, image, imageAlt, type = "website", extra = "" }){
  return `<!doctype html>
<html lang="${cfg.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(abs(url))}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#a48cf4">
<meta property="og:site_name" content="${esc(cfg.siteName)}">
<meta property="og:locale" content="${esc(cfg.locale)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(abs(url))}">
<meta property="og:image" content="${esc(abs(image))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs(image))}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Poppins:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/site.css">
${extra}</head>`;
}
const topbar = () => `<header class="top"><a class="brand" href="/" aria-label="${esc(cfg.siteName)} home"><img src="/img/logo.png" alt="${esc(cfg.siteName)}" width="120" height="78"><span>${esc(cfg.tagline)}</span></a>
<nav class="nav"><a href="/recipes/">All recipes</a><a href="/#fridge">What's in your kitchen?</a><a class="pill" href="/#list">Shopping list</a></nav></header>`;
const footer = () => `<footer class="foot"><p><a href="/">${esc(cfg.siteName)}</a> · ${esc(cfg.tagline)} · <a href="/recipes/">All recipes</a></p></footer>`;
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>\n`;

/* ---------- recipe pages ---------- */
function related(r){
  const same = recipes.filter(x => x.id !== r.id && x.kitchen === r.kitchen);
  const close = same.filter(x => x.category === r.category);
  return [...close, ...same.filter(x => x.category !== r.category)].slice(0, 4);
}
function recipePage(r){
  const title = `${r.title} recipe – ${cfg.siteName}`;
  const desc = clip(`${r.summary} Ready in ${fmtTime(r.time)}, serves ${r.serves}.`, 158);
  const og = `/img/og/${r.id}.jpg`;
  const kSlug = kitchenSlug(r.kitchen);
  const diet = r.diet === "Vegan" ? ["https://schema.org/VeganDiet", "https://schema.org/VegetarianDiet"] : (r.diet === "Vegetarian" || r.vegetarian) ? ["https://schema.org/VegetarianDiet"] : undefined;
  const schema = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: r.title, description: r.summary, url: abs(r.url),
    image: [abs(`/img/1x1/${r.id}.webp`), abs(`/img/4x3/${r.id}.webp`), abs(og)],
    author: { "@type": "Organization", name: cfg.siteName, url: BASE + "/" },
    publisher: { "@type": "Organization", name: cfg.siteName, logo: { "@type": "ImageObject", url: abs("/icon-512.png") } },
    datePublished: cfg.published, dateModified: today,
    totalTime: iso(r.time), recipeYield: [String(r.serves), `${r.serves} servings`],
    recipeCategory: r.category, recipeCuisine: r.kitchen || undefined,
    keywords: [r.kitchen, r.course, r.category, r.diet, r.spicy ? "spicy" : "", r.vegetarian ? "vegetarian" : ""].filter(Boolean).join(", "),
    recipeIngredient: r.ingredients,
    recipeInstructions: r.steps.map((t, i) => ({ "@type": "HowToStep", position: i + 1, name: `Step ${i + 1}`, text: t, url: abs(`${r.url}#step-${i + 1}`) })),
    nutrition: r.kcal ? { "@type": "NutritionInformation", calories: `${r.kcal} calories`, servingSize: "1 serving" } : undefined,
    suitableForDiet: diet
  };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: cfg.siteName, item: BASE + "/" },
    { "@type": "ListItem", position: 2, name: "Recipes", item: abs("/recipes/") },
    { "@type": "ListItem", position: 3, name: `${kitchenLabel(r.kitchen)} recipes`, item: abs(`/recipes/#${kSlug}`) },
    { "@type": "ListItem", position: 4, name: r.title, item: abs(r.url) } ] };
  const facts = [["Time", fmtTime(r.time)], ["Serves", r.serves], r.kcal && ["Calories", `≈ ${r.kcal} kcal per serving`], r.kitchen && ["Kitchen", r.kitchen], r.course && ["Course", r.course], r.diet && ["Diet", r.diet]].filter(Boolean);
  const tags = [r.spicy && "Spicy", (r.diet === "Vegan" && "Vegan") || (r.vegetarian && "Vegetarian")].filter(Boolean);
  return head({ title, description: desc, url: r.url, image: og, imageAlt: `${r.title}, served`, type: "article",
      extra: ld(schema) + ld(crumbs) + `<meta property="article:section" content="${esc(kitchenLabel(r.kitchen))} recipes">\n` }) + `
<body>
<div class="wrap">
${topbar()}
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(cfg.siteName)}</a> › <a href="/recipes/">Recipes</a> › <a href="/recipes/#${kSlug}">${esc(kitchenLabel(r.kitchen))}</a> › <span aria-current="page">${esc(r.title)}</span></nav>
<main class="recipe">
  <figure class="hero"><img src="/assets/food/${r.id}-wide.webp" alt="${esc(r.title)}" width="1200" height="670" fetchpriority="high"></figure>
  <header class="rhead">
    <p class="eyebrow">${esc([r.course || r.category, r.kitchen].filter(Boolean).join(" · "))}</p>
    <h1>${esc(r.title)}</h1>
    <p class="lede">${esc(r.summary)}</p>
    ${tags.length || r.allergens.length ? `<p class="tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}${r.allergens.length ? `<span class="alg-h">Contains</span>${r.allergens.map(a => `<span class="tag soft alg">${ALG[a] ? `<img src="/img/allergens/${ALG[a]}.png" alt="" width="24" height="24">` : ""}${esc(a)}</span>`).join("")}` : ""}</p>` : ""}
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <div class="actions"><button class="btn primary" type="button" id="addList" data-id="${esc(r.id)}" data-serves="${r.serves}">Add to shopping list</button><a class="btn" href="/#list" id="viewList" hidden>Open your list</a><button class="btn" type="button" id="shareIt" data-url="${esc(abs(r.url))}" data-title="${esc(r.title)}">Share recipe</button></div>
    <p class="msg" id="msg" role="status"></p>
  </header>
  <div class="cols">
    <section class="panel ingredients" aria-labelledby="ing-h"><h2 id="ing-h">Ingredients</h2><p class="small">For ${r.serves} serving${r.serves === 1 ? "" : "s"}</p>
      <ul>${r.ingredients.map(i => `<li>${esc(i)}</li>`).join("")}</ul></section>
    <section class="method" aria-labelledby="m-h"><h2 id="m-h">Method</h2>
      <ol>${r.steps.map((s, i) => `<li id="step-${i + 1}"><span class="step-n">Step ${i + 1}</span><p>${esc(s)}</p></li>`).join("")}</ol>
      <aside class="keep"><h3>Keeping leftovers</h3><p>${esc(r.keep)}</p></aside>
      <p class="img-note">Food images are visual representations of the recipe. Actual results may vary depending on ingredients, preparation and presentation.</p>
    </section>
  </div>
  <section class="more" aria-labelledby="more-h"><h2 id="more-h">More ${esc(kitchenLabel(r.kitchen).toLowerCase())} recipes</h2>
    <div class="grid">${related(r).map(card).join("")}</div>
    <p><a class="btn" href="/recipes/#${kSlug}">See all ${esc(kitchenLabel(r.kitchen).toLowerCase())} recipes</a></p></section>
</main>
${footer()}
</div>
<script src="/js/recipe.js" defer></script>
</body>
</html>
`;
}
const card = r => `<a class="card" href="${r.url}"><img src="/assets/food/${r.id}-wide.webp" alt="" width="1200" height="670" loading="lazy"><span class="ct">${esc(r.title)}</span><span class="cm">${esc(fmtTime(r.time))} · serves ${r.serves}</span></a>`;

/* ---------- recipes index ---------- */
function recipesIndex(){
  const groups = KITCHEN_ORDER.map(k => [k, recipes.filter(r => (r.kitchen || "") === k).sort((a, b) => a.title.localeCompare(b.title))]).filter(([, l]) => l.length);
  const list = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: recipes.map((r, i) => ({ "@type": "ListItem", position: i + 1, url: abs(r.url) })) };
  return head({ title: `All recipes – ${cfg.siteName}`, description: clip(`All ${recipes.length} ${cfg.siteName} recipes by kitchen: ${groups.map(([k, l]) => `${kitchenLabel(k)} (${l.length})`).join(", ")}.`, 158),
      url: "/recipes/", image: `/img/og/${cfg.homeImage}.jpg`, imageAlt: `${cfg.siteName} recipes`, extra: ld(list) }) + `
<body>
<div class="wrap">
${topbar()}
<main class="index">
  <header class="rhead"><p class="eyebrow">${recipes.length} recipes</p><h1>All recipes</h1><p class="lede">${esc(cfg.description)}</p>
  <p class="jump">${groups.map(([k, l]) => `<a class="tag" href="#${kitchenSlug(k)}">${esc(kitchenLabel(k))} · ${l.length}</a>`).join("")}</p></header>
  ${groups.map(([k, l]) => `<section class="more" id="${kitchenSlug(k)}"><h2>${esc(kitchenLabel(k))} recipes</h2><div class="grid">${l.map(card).join("")}</div></section>`).join("\n  ")}
</main>
${footer()}
</div>
</body>
</html>
`;
}

/* ---------- the app at / ---------- */
function appPage(){
  let app = readFileSync(path.join(ROOT, "index.html"), "utf8");
  const urls = Object.fromEntries(recipes.map(r => [r.id, r.url]));
  const site = { "@context": "https://schema.org", "@type": "WebSite", name: cfg.siteName, url: BASE + "/", description: cfg.description };
  const org = { "@context": "https://schema.org", "@type": "Organization", name: cfg.siteName, url: BASE + "/", logo: abs("/icon-512.png") };
  const h = head({ title: `${cfg.siteName} – Easy Recipes for Every Taste & Mood`, description: cfg.description, url: "/", image: `/img/og/${cfg.homeImage}.jpg`, imageAlt: `${cfg.siteName}: ${cfg.tagline}`,
      extra: ld(site) + ld(org) + `<script>window.DADO_PUBLIC=true;window.DADO_URLS=${JSON.stringify(urls)};</script>\n` })
    .replace(/<link rel="stylesheet" href="\/css\/site.css">\n/, "")
    .replace(/<\/head>$/, "");
  // the app file starts with its own <title>, description and og:title; drop those so the built ones win
  app = app.replace(/^\s*<title>[\s\S]*?<\/title>\s*/, "").replace(/<meta name="description"[^>]*>\s*/, "").replace(/<meta property="og:title"[^>]*>\s*/, "");
  if (!app.includes('<section class="hero" id="hero"')) throw new Error("App layout changed: cannot find where the body starts");
  return h + app.replace('<section class="hero" id="hero"', '</head>\n<body>\n<section class="hero" id="hero"') + "\n</body>\n</html>\n";
}

/* ---------- build ---------- */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
write("index.html", appPage());
for (const r of recipes) write(`recipes/${r.slug}/index.html`, recipePage(r));
write("recipes/index.html", recipesIndex());
mkdirSync(path.join(DIST, "assets/food"), { recursive: true });
for (const f of readdirSync(path.join(ROOT, "assets/food"))) if (f.endsWith(".webp")) copyFileSync(path.join(ROOT, "assets/food", f), path.join(DIST, "assets/food", f));
for (const f of ["site.css"]) write(`css/${f}`, readFileSync(path.join(SITE, "src", f)));
mkdirSync(path.join(DIST, "img/allergens"), { recursive: true });
for (const k of Object.values(ALG)) copyFileSync(path.join(ROOT, "assets/allergens", k + ".png"), path.join(DIST, "img/allergens", k + ".png"));
write("js/recipe.js", readFileSync(path.join(SITE, "src/recipe.js")));
write("404.html", head({ title: `Page not found – ${cfg.siteName}`, description: "This page isn't here. Find a recipe instead.", url: "/404.html", image: `/img/og/${cfg.homeImage}.jpg`, imageAlt: cfg.siteName })
  .replace('content="index,follow,max-image-preview:large"', 'content="noindex"') + `\n<body><div class="wrap">${topbar()}<main class="rhead" style="padding:60px 0"><h1>We couldn't find that page</h1><p class="lede">It may have moved. Try <a href="/recipes/">all recipes</a> or the <a href="/">home page</a>.</p></main>${footer()}</div></body></html>\n`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${abs("/sitemap.xml")}\n`);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${abs("/")}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${abs("/recipes/")}</loc><lastmod>${today}</lastmod></url>
${recipes.map(r => `  <url><loc>${esc(abs(r.url))}</loc><lastmod>${today}</lastmod><image:image><image:loc>${esc(abs(`/img/4x3/${r.id}.webp`))}</image:loc></image:image></url>`).join("\n")}
</urlset>
`);
write("site.webmanifest", JSON.stringify({ name: cfg.siteName, short_name: cfg.siteName, description: cfg.description, start_url: "/", display: "standalone", background_color: "#a48cf4", theme_color: "#a48cf4",
  icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }] }, null, 2));
write("CNAME", new URL(BASE).hostname + "\n");
write(".nojekyll", "");
console.log(`Built ${recipes.length} recipe pages for ${BASE} into ${path.relative(ROOT, DIST)}`);
