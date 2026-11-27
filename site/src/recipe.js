// Recipe pages: add the recipe to the Dado shopping list (shared with the app through this browser) and share the page.
(() => {
  const add = document.getElementById("addList"), view = document.getElementById("viewList"), share = document.getElementById("shareIt"), msg = document.getElementById("msg");
  const say = t => { if (msg) msg.textContent = t; };
  const read = () => { try { return JSON.parse(localStorage.getItem("dado-prefs") || "{}") || {}; } catch { return {}; } };
  const inList = p => !!(p.list && Array.isArray(p.list.recipes) && p.list.recipes.some(x => x && x.id === add.dataset.id));
  const paint = () => { const on = inList(read()); add.textContent = on ? "✓ In your shopping list" : "Add to shopping list"; add.classList.toggle("done", on); view.hidden = !on; };
  if (add){
    paint();
    add.addEventListener("click", () => {
      const p = read();
      p.list = p.list && typeof p.list === "object" ? p.list : {};
      for (const k of ["recipes", "extras", "checked", "hidden"]) if (!Array.isArray(p.list[k])) p.list[k] = [];
      if (!p.list.qty || typeof p.list.qty !== "object") p.list.qty = {};
      if (!p.list.sort) p.list.sort = "aisle";
      if (!inList(p)) p.list.recipes.push({ id: add.dataset.id, serves: Number(add.dataset.serves) || 2 });
      try { localStorage.setItem("dado-prefs", JSON.stringify(p)); say("Added. Your list merges it with your other recipes."); }
      catch { say("Couldn't save to your list in this browser."); }
      paint();
    });
  }
  if (share){
    share.addEventListener("click", async () => {
      const url = share.dataset.url, title = share.dataset.title;
      try { if (navigator.share){ await navigator.share({ title, url }); return; } } catch (e){ if (e && e.name === "AbortError") return; }
      try { await navigator.clipboard.writeText(url); say("Link copied. Paste it anywhere to share."); }
      catch { say("Copy this link: " + url); }
    });
  }
})();
