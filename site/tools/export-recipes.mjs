// Reads every house recipe out of the Dado app (index.html) into site/data/recipes.json.
// Run after changing recipes in the app:  node site/tools/export-recipes.mjs
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, "index.html")).href);
await page.waitForFunction(() => typeof allRecipes === "function");
const data = await page.evaluate(() => allRecipes().filter(r => r.house).map(r => {
  const k = kitchenOf(r.cuisine), t = traits(r);
  return {
    id: r.id, slug: r.u || "", title: r.title, summary: r.summary || "", category: r.category || "",
    course: COURSES[r.course] || "", kitchen: k ? k.name : "", kitchenKey: r.cuisine || "",
    time: Number(r.time) || 0, serves: Number(r.serves) || 0, kcal: kcal(r) || 0,
    diet: r.diet || "", vegetarian: !!t.veg, spicy: !!t.spicy, allergens: t.allergens || [],
    ingredients: r.ingredients || [], steps: r.steps || [], keep: storageTip(r), photo: !!PHOTOS[r.id]
  };
}));
writeFileSync(path.join(root, "site/data/recipes.json"), JSON.stringify(data, null, 1));
console.log(`Exported ${data.length} recipes`);
await browser.close();
