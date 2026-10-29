(() => {
  "use strict";
  const node = document.getElementById("bn-article-recommendations-data");
  if (!node) return;
  let data;
  try { data = JSON.parse(node.textContent); } catch (_) { return; }
  const articles = (data.articles || []).filter(item => item.url && item.url !== data.current);
  const body = document.querySelector("article .content, .page.single .content, main article .content, main .content");
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
  const eligible = [...body.children].filter(el => ["P","UL","OL","BLOCKQUOTE","TABLE"].includes(el.tagName));
  if (eligible.length >= 4) {
    const choice = articles[Math.floor(Math.random() * articles.length)];
    const section = document.createElement("aside");
    section.className = "bn-rec-section bn-rec-inline";
    section.setAttribute("aria-label", "Có thể bạn sẽ thích");
    const heading = document.createElement("h2");
    heading.textContent = "CÓ THỂ BẠN SẼ THÍCH";
    section.append(heading, card(choice));
    eligible[Math.floor(eligible.length / 2)].insertAdjacentElement("afterend", section);
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
