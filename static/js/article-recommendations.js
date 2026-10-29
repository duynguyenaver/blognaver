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
  // Insert a single suggestion within the rendered article body, not at the footer.
  // Select an actual text paragraph; nested Markdown wrappers are supported.
  const paragraphs = [...body.querySelectorAll("p")]
    .filter(p => !p.closest(".bn-rec-section, aside, nav, footer, header")
      && (p.textContent || "").trim().length >= 40);
  const anchors = paragraphs.length
    ? paragraphs
    : [...body.querySelectorAll("h2,h3,blockquote,ul,ol")].filter(el => !el.closest(".bn-rec-section"));
  if (anchors.length) {
    const choice = articles[Math.floor(Math.random() * articles.length)];
    const inline = document.createElement("aside");
    inline.className = "bn-rec-section bn-rec-inline";
    inline.setAttribute("aria-label", "Có thể bạn sẽ thích");
    const title = document.createElement("h2");
    title.textContent = "CÓ THỂ BẠN SẼ THÍCH";
    inline.append(title, card(choice));
    const at = anchors[Math.max(0, Math.floor((anchors.length - 1) / 2))];
    at.insertAdjacentElement("afterend", inline);
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
