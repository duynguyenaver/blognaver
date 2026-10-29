(() => {
  "use strict";
  const node = document.getElementById("bn-article-recommendations-data");
  if (!node) return;
  let data;
  try { data = JSON.parse(node.textContent); } catch (_) { return; }
  const articles = (data.articles || []).filter(item => item.url && item.url !== data.current);
  // DoIt can wrap rendered Markdown in nested divs: do not depend on direct children.
  const candidates = [
    ".page.single .content", ".single .content", "article .content",
    "main .content", ".post-content", ".post-body", "article"
  ];
  const body = candidates.map(selector => document.querySelector(selector))
    .find(element => element && element.querySelector("p, h2, h3"));
  if (!body || !articles.length) return;
  function card(item) {
    const link = document.createElement("a");
    link.className = "bn-rec-card";
    link.href = item.url;
    const visual = document.createElement("span");
    visual.className = "bn-rec-image";
    if (item.image) {
      const image = document.createElement("img");
      image.loading = "lazy";
      image.decoding = "async";
      image.src = item.image;
      image.alt = "";
      image.addEventListener("error", () => { image.remove(); visual.classList.add("bn-rec-fallback"); }, { once: true });
      visual.appendChild(image);
    } else visual.classList.add("bn-rec-fallback");
    const copy = document.createElement("span");
    copy.className = "bn-rec-copy";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const description = document.createElement("small");
    description.textContent = item.description || "Khám phá bài viết";
    copy.append(title, description);
    link.append(visual, copy);
    return link;
  }
  const series = Array.isArray(data.series) ? data.series : [];
  const same = articles.filter(a => Array.isArray(a.series) && a.series.some(v => series.includes(v))).sort((a,b) => Number(a.order)-Number(b.order));
  const next = same.find(a => Number(a.order) > Number(data.order || 0));
  const suggested = [];
  if (next) suggested.push(next);
  for (const a of [...same, ...[...articles].sort((a,b) => Number(b.date)-Number(a.date))]) {
    if (suggested.length === 3) break;
    if (!suggested.some(x => x.url === a.url)) suggested.push(a);
  }
  const section = document.createElement("section");
  section.className = "bn-rec-section bn-rec-bottom";
  section.setAttribute("aria-label","Bài viết tiếp theo hoặc liên quan");
  const heading = document.createElement("h2");
  heading.textContent = "BÀI VIẾT TIẾP THEO & LIÊN QUAN";
  const grid = document.createElement("div");
  grid.className = "bn-rec-grid";
  suggested.forEach(item => grid.appendChild(card(item)));
  section.append(heading, grid);
  body.appendChild(section);
})();
